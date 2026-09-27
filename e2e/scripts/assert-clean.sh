#!/usr/bin/env bash
# e2e実行後にテストデータが残っていないことを検証する（CIと手元の両方で使う）
#
# 「残り」= 既に終了した実行が作成したe2eユーザー。
# 実行中の別の実行（UIモード等）のユーザーは、その実行が後始末するため対象外とする。
# 判定はテストユーザーに記録されたPlaywright本体のプロセスID(e2e_run_pid)の生死で行う。
# 画面の新規登録で作られたユーザーは、メールアドレスに埋め込まれたプロセスIDで判定する（e2e/helpers/testUser.ts と同じ形式）
set -euo pipefail

DB_CONTAINER="supabase_db_StudyLog"
UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
SIGNUP_EMAIL="^e2e-signup\\.${UUID}\\.([0-9]+)\\.${UUID}@example\\.com$"

rows=$(docker exec "$DB_CONTAINER" psql -U postgres -tA -F ' ' -c \
  "select coalesce(raw_app_meta_data->>'e2e_run_pid', substring(email from '${SIGNUP_EMAIL}'), ''), count(*)
     from auth.users
    where raw_app_meta_data ? 'e2e_run_id' or email ~ '${SIGNUP_EMAIL}'
    group by 1")

leftover=0
running=0
while read -r pid count; do
  [ -z "${count:-}" ] && continue
  if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
    running=$((running + count))
  else
    leftover=$((leftover + count))
  fi
done <<< "$rows"

if [ "$running" -ne 0 ]; then
  echo "実行中の別のe2eのテストユーザー ${running} 件は対象外としました。"
fi
if [ "$leftover" -ne 0 ]; then
  echo "終了済みのe2e実行のテストユーザーが ${leftover} 件残っています。"
  exit 1
fi
echo "e2eのテストデータは残っていません。"

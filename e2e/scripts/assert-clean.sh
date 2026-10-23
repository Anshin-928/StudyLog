#!/usr/bin/env bash
# e2e実行後にテストデータが残っていないことを検証する（CIと手元の両方で使う）
#
# 「残り」= 既に終了した実行が作成したe2eユーザーと、Storage のファイル。
# 実行中の別の実行（UIモード等）のユーザーとそのファイルは、その実行が後始末するため対象外とする。
# 判定はテストユーザーに記録されたPlaywright本体のプロセスID(e2e_run_pid)の生死で行う。
# 画面の新規登録で作られたユーザーは、メールアドレスに埋め込まれたプロセスIDで判定する（e2e/helpers/testUser.ts と同じ形式）
#
# Storage のファイルはユーザーを削除しても消えない。ファイルは `<ユーザーID>/...` に置かれるので、先頭のフォルダのユーザーで判定する。
# ユーザーがもう存在しないファイルは、終了した実行の残りとして扱う（ローカルの Supabase には e2e 以外でファイルを置かない）
set -euo pipefail

DB_CONTAINER="supabase_db_StudyLog"
UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
SIGNUP_EMAIL="^e2e-signup\\.${UUID}\\.([0-9]+)\\.${UUID}@example\\.com$"

# ユーザーのプロセスID（実行中か判定できないときは -）。
# 空文字にすると psql の出力が「 1」になり、read が先頭の空白を詰めてプロセスIDと件数を取り違えるので、- にする
RUN_PID="coalesce(u.raw_app_meta_data->>'e2e_run_pid', substring(u.email from '${SIGNUP_EMAIL}'), '-')"

# 「プロセスID 件数」の行を受け取り、実行中の件数を running に、それ以外を leftover に入れる
count_by_run() {
  local rows
  rows=$(docker exec "$DB_CONTAINER" psql -U postgres -tA -F ' ' -c "$1")
  leftover=0
  running=0
  while read -r pid count; do
    [ -z "${count:-}" ] && continue
    if [ "$pid" != "-" ] && ps -p "$pid" > /dev/null 2>&1; then
      running=$((running + count))
    else
      leftover=$((leftover + count))
    fi
  done <<< "$rows"
}

failed=0

count_by_run "select ${RUN_PID}, count(*)
                from auth.users u
               where u.raw_app_meta_data ? 'e2e_run_id' or u.email ~ '${SIGNUP_EMAIL}'
               group by 1"
if [ "$running" -ne 0 ]; then
  echo "実行中の別のe2eのテストユーザー ${running} 件は対象外としました。"
fi
if [ "$leftover" -ne 0 ]; then
  echo "終了済みのe2e実行のテストユーザーが ${leftover} 件残っています。"
  failed=1
fi

# ユーザーが存在しないファイルは u の列がすべて null になり、プロセスIDが - として残りに数えられる
file_rows=$(docker exec "$DB_CONTAINER" psql -U postgres -tA -F ' ' -c \
  "select ${RUN_PID}, o.bucket_id || '/' || o.name
     from storage.objects o
     left join auth.users u on u.id::text = (storage.foldername(o.name))[1]")
running_files=0
leftover_files=()
while read -r pid path; do
  [ -z "${path:-}" ] && continue
  if [ "$pid" != "-" ] && ps -p "$pid" > /dev/null 2>&1; then
    running_files=$((running_files + 1))
  else
    leftover_files+=("$path")
  fi
done <<< "$file_rows"
if [ "$running_files" -ne 0 ]; then
  echo "実行中の別のe2eの Storage のファイル ${running_files} 件は対象外としました。"
fi
if [ "${#leftover_files[@]}" -ne 0 ]; then
  echo "終了済みのe2e実行の Storage のファイルが ${#leftover_files[@]} 件残っています。"
  printf '  %s\n' "${leftover_files[@]}"
  failed=1
fi

[ "$failed" -ne 0 ] && exit 1
echo "e2eのテストデータは残っていません。"

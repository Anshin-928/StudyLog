// テストごとに使い捨てるユーザーの作成・削除
// auth.users を消すと profiles 経由で ON DELETE CASCADE され、そのユーザーの全データ（記録・教材・フォロー等）が消える
//
// 所有の管理:
// - 作成するユーザーの app_metadata に、実行ID(e2e_run_id)と、その実行を管理するPlaywright本体のプロセスID
//   (e2e_run_pid)を記録する。app_metadata は service role でしか書き込めないため、e2e以外で作られたユーザーが
//   誤って削除対象になることはない
// - 実行終了時に削除するのは、その実行IDを持つユーザーだけ（同じDBで動く別の実行には触れない）
// - 中断などで残ったユーザーは「記録されたプロセスが既に終了している」ものだけを回収する。
//   実行中のプロセスのユーザーは、どれだけ長時間の実行（UIモード等）でも回収しない
//   （ローカルSupabase限定のため、プロセスの生死はテストを実行するマシン上で判定できる）
// - 画面の新規登録で作るユーザーは app_metadata を付けられないため、代わりにメールアドレスへ実行IDとプロセスIDを
//   埋め込む（signUpEmailForCurrentRun）。アドレスは登録の送信前に決まるので、どの時点で中断しても回収できる。
//   予約ドメイン example.com かつ厳密な形式に一致するものだけを対象にするため、e2e以外のユーザーには一致しない
import { randomUUID } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { requiredEnv } from './env';
import { createSupabaseAdmin } from './supabaseAdmin';

const RUN_ID_KEY = 'e2e_run_id';
const RUN_PID_KEY = 'e2e_run_pid';
const TEST_PASSWORD = 'e2e-test-password-123';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// e2e-signup.<実行ID>.<プロセスID>.<ランダムID>@example.com（e2e/scripts/assert-clean.sh も同じ形式で判定している）
const SIGNUP_EMAIL_PATTERN = new RegExp(`^e2e-signup\\.(${UUID})\\.(\\d+)\\.${UUID}@example\\.com$`);

export type TestUser = {
  id: string;
  email: string;
  password: string;
};

// global-setup.ts で実行ごとに発行し、環境変数で各ワーカーに引き継ぐ
export function startRun(): void {
  process.env.E2E_RUN_ID = randomUUID();
  // global-setup を実行したプロセス = global-teardown まで生存し続けるPlaywright本体
  process.env.E2E_RUN_PID = String(process.pid);
}

function currentRun() {
  return { runId: requiredEnv('E2E_RUN_ID'), runPid: Number(requiredEnv('E2E_RUN_PID')) };
}

export async function createTestUser(): Promise<TestUser> {
  const admin = createSupabaseAdmin();
  const { runId, runPid } = currentRun();
  const email = `e2e-${runId}-${randomUUID()}@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    app_metadata: { [RUN_ID_KEY]: runId, [RUN_PID_KEY]: runPid },
  });
  if (error) throw new Error(`テストユーザーの作成に失敗しました: ${error.message}`);

  return { id: data.user.id, email, password: TEST_PASSWORD };
}

// 画面から新規登録するときに使うメールアドレス。この実行の所有として、削除漏れや中断時も回収される
export function signUpEmailForCurrentRun(): string {
  const { runId, runPid } = currentRun();
  return `e2e-signup.${runId}.${runPid}.${randomUUID()}@example.com`;
}

// 画面の新規登録で作られたユーザーを削除する（登録に至らず存在しない場合は何もしない）
export async function deleteSignedUpUser(email: string): Promise<void> {
  const user = (await listE2eUsers()).find((u) => u.email === email);
  if (user) await deleteTestUser(user.id);
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`テストユーザーの削除に失敗しました (${userId}): ${error.message}`);
}

// この実行が作成し、まだ残っているユーザーを削除する。削除後に1件も残っていないことまで検証し、削除した件数を返す
export async function deleteUsersOfCurrentRun(): Promise<number> {
  const { runId } = currentRun();
  const isCurrentRun = (user: User) => runOwner(user)?.runId === runId;

  const deleted = await deleteE2eUsersWhere(isCurrentRun);
  const remaining = (await listE2eUsers()).filter(isCurrentRun);
  if (remaining.length > 0) {
    throw new Error(`この実行のテストユーザーが ${remaining.length} 件削除できずに残っています。`);
  }
  return deleted;
}

// 既に終了した過去の実行が残したユーザーを削除する。実行中の別の実行のユーザーには触れない。削除した件数を返す
export async function deleteUsersOfFinishedRuns(): Promise<number> {
  return deleteE2eUsersWhere((user) => !isProcessAlive(runOwner(user)?.runPid ?? NaN));
}

// e2eが作成したユーザーなら、その実行ID・プロセスIDを返す（e2eのユーザーでなければ null）
function runOwner(user: User): { runId: string; runPid: number } | null {
  if (typeof user.app_metadata[RUN_ID_KEY] === 'string') {
    return { runId: user.app_metadata[RUN_ID_KEY], runPid: Number(user.app_metadata[RUN_PID_KEY]) };
  }
  const match = user.email?.match(SIGNUP_EMAIL_PATTERN);
  return match ? { runId: match[1], runPid: Number(match[2]) } : null;
}

function isProcessAlive(pid: number): boolean {
  // PIDが記録されていない等で判定できないものは、誤って消さないよう「生存」とみなす
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0); // シグナル0は送信せず、存在確認だけを行う
    return true;
  } catch (err) {
    // EPERM: 存在するが権限がない = 生存
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function listAllUsers(): Promise<User[]> {
  const admin = createSupabaseAdmin();
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`ユーザー一覧の取得に失敗しました: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

async function listE2eUsers(): Promise<User[]> {
  return (await listAllUsers()).filter((user) => runOwner(user) !== null);
}

async function deleteE2eUsersWhere(predicate: (user: User) => boolean): Promise<number> {
  const targets = (await listE2eUsers()).filter(predicate);
  for (const user of targets) {
    await deleteTestUser(user.id);
  }
  return targets.length;
}

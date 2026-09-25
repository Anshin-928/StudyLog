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
import { randomUUID } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { requiredEnv } from './env';
import { createSupabaseAdmin } from './supabaseAdmin';

const RUN_ID_KEY = 'e2e_run_id';
const RUN_PID_KEY = 'e2e_run_pid';
const TEST_PASSWORD = 'e2e-test-password-123';

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

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`テストユーザーの削除に失敗しました (${userId}): ${error.message}`);
}

// この実行が作成し、まだ残っているユーザーを削除する。削除後に1件も残っていないことまで検証し、削除した件数を返す
export async function deleteUsersOfCurrentRun(): Promise<number> {
  const { runId } = currentRun();
  const isCurrentRun = (user: User) => user.app_metadata[RUN_ID_KEY] === runId;

  const deleted = await deleteE2eUsersWhere(isCurrentRun);
  const remaining = (await listE2eUsers()).filter(isCurrentRun);
  if (remaining.length > 0) {
    throw new Error(`この実行のテストユーザーが ${remaining.length} 件削除できずに残っています。`);
  }
  return deleted;
}

// 既に終了した過去の実行が残したユーザーを削除する。実行中の別の実行のユーザーには触れない。削除した件数を返す
export async function deleteUsersOfFinishedRuns(): Promise<number> {
  return deleteE2eUsersWhere((user) => !isProcessAlive(Number(user.app_metadata[RUN_PID_KEY])));
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

async function listE2eUsers(): Promise<User[]> {
  const admin = createSupabaseAdmin();
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`ユーザー一覧の取得に失敗しました: ${error.message}`);
    users.push(...data.users.filter((user) => typeof user.app_metadata[RUN_ID_KEY] === 'string'));
    if (data.users.length < 1000) break;
  }
  return users;
}

async function deleteE2eUsersWhere(predicate: (user: User) => boolean): Promise<number> {
  const targets = (await listE2eUsers()).filter(predicate);
  for (const user of targets) {
    await deleteTestUser(user.id);
  }
  return targets.length;
}

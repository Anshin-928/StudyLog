// 全テストの実行前に1回だけ実行される
import { assertSameSupabase, requiredEnv } from './helpers/env';
import { deleteUsersOfFinishedRuns, startRun } from './helpers/testUser';

export default async function globalSetup() {
  // アプリ(Vite)とテストデータ操作が、同じローカルSupabaseに向いていることを保証する
  assertSameSupabase('VITE_SUPABASE_URL', 'E2E_SUPABASE_URL');

  await assertSupabaseIsRunning(requiredEnv('E2E_SUPABASE_URL'));

  startRun();

  // 既に終了した過去の実行（中断・強制終了）の残りを回収する。実行中の別の実行のユーザーには触れない
  const deleted = await deleteUsersOfFinishedRuns();
  if (deleted > 0) console.log(`[e2e] 過去の実行で残っていたテストユーザー ${deleted} 件を削除しました`);
}

// 起動していない場合に、原因の分かりにくい接続エラーではなく対処法を示して止める
async function assertSupabaseIsRunning(url: string) {
  try {
    await fetch(`${url}/auth/v1/health`);
  } catch {
    throw new Error(`ローカルSupabase(${url})に接続できません。npm run supabase:local:start を実行してください。`);
  }
}

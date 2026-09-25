// 全テストの実行後に1回だけ実行される。この実行が作成し、各テストのfixtureで削除しきれなかったユーザーを消す
import { deleteUsersOfCurrentRun } from './helpers/testUser';

export default async function globalTeardown() {
  const deleted = await deleteUsersOfCurrentRun();
  if (deleted > 0) console.warn(`[e2e] 削除されずに残っていたテストユーザー ${deleted} 件を削除しました`);
}

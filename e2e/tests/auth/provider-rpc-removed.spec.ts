// 移行完了後（20260926120100_after_frontend_deploy.sql 適用後）の検証
// メールアドレスの登録有無・登録方法を返していた check_user_provider が廃止され、誰からも呼べないこと
import { test, expect } from '../../helpers/fixtures';
import { createAnonClient } from '../../helpers/userClient';

test.describe('登録有無を判定するRPCの廃止', () => {
  test('未ログインでは check_user_provider を呼べない', async ({ testUser }) => {
    const { error } = await createAnonClient().rpc('check_user_provider', { p_email: testUser.email });

    expect(error).not.toBeNull();
  });
});

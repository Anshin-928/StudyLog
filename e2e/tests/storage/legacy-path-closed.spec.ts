// 移行完了後（20260926120100_after_frontend_deploy.sql 適用後）の検証
// 旧パス public/ は閉じられ、`<ユーザーID>/` 以外には書き込めないこと
import { test, expect } from '../../helpers/fixtures';
import { createSupabaseAdmin } from '../../helpers/supabaseAdmin';
import { createUserClient } from '../../helpers/userClient';

const BUCKETS = ['study-logs', 'material-images'] as const;
// 1x1 の透過PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const upload = { contentType: 'image/png' };

for (const bucket of BUCKETS) {
  test.describe(`${bucket} バケットの旧パス public/`, () => {
    const uploaded: string[] = [];

    test.afterEach(async () => {
      if (uploaded.length === 0) return;
      const { error } = await createSupabaseAdmin().storage.from(bucket).remove(uploaded.splice(0));
      if (error) throw new Error(`テスト画像の削除に失敗しました: ${error.message}`);
    });

    test('ログイン済みでも旧パスにはアップロードできない', async ({ testUser }) => {
      const client = await createUserClient(testUser);
      const path = `public/${testUser.id}-${Date.now()}.png`;
      const { error } = await client.storage.from(bucket).upload(path, PNG, upload);
      if (!error) uploaded.push(path);

      expect(error).not.toBeNull();
    });
  });
}

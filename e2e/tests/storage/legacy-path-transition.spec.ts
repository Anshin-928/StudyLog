// 移行期間中（20260926120000_harden_rls.sql 適用後、20260926120100_after_frontend_deploy.sql 適用前）の検証
// 旧フロントエンドは public/ にアップロードするため、ログイン済みなら引き続き書き込めること（切り替え中の失敗を防ぐ）
// 後半のマイグレーションを追加するPRで、このファイルは legacy-path-closed.spec.ts に置き換える
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

    test('ログイン済みなら旧パスにアップロードできる', async ({ testUser }) => {
      const client = await createUserClient(testUser);
      const path = `public/${testUser.id}-${Date.now()}.png`;
      const { error } = await client.storage.from(bucket).upload(path, PNG, upload);
      if (!error) uploaded.push(path);

      expect(error).toBeNull();
    });
  });
}

// Storage のアップロード権限（未ログイン・他人のフォルダへの書き込みを拒否できていること）の検証
// アップロードに成功したファイルはユーザー削除では消えないため、テスト内で必ず削除する
import { test, expect } from '../../helpers/fixtures';
import { createSupabaseAdmin } from '../../helpers/supabaseAdmin';
import { createAnonClient, createUserClient } from '../../helpers/userClient';

const BUCKETS = ['study-logs', 'material-images'] as const;
// 1x1 の透過PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const upload = { contentType: 'image/png' };

for (const bucket of BUCKETS) {
  test.describe(`${bucket} バケットへのアップロード`, () => {
    const uploaded: string[] = [];

    test.afterEach(async () => {
      if (uploaded.length === 0) return;
      const { error } = await createSupabaseAdmin().storage.from(bucket).remove(uploaded.splice(0));
      if (error) throw new Error(`テスト画像の削除に失敗しました: ${error.message}`);
    });

    test('未ログインではアップロードできない', async ({ testUser }) => {
      const path = `${testUser.id}/anon-${Date.now()}.png`;
      const { error } = await createAnonClient().storage.from(bucket).upload(path, PNG, upload);
      if (!error) uploaded.push(path);

      expect(error).not.toBeNull();
    });

    test('他人のフォルダにはアップロードできない', async ({ testUser }) => {
      const client = await createUserClient(testUser);
      const path = `00000000-0000-0000-0000-000000000000/${testUser.id}.png`;
      const { error } = await client.storage.from(bucket).upload(path, PNG, upload);
      if (!error) uploaded.push(path);

      expect(error).not.toBeNull();
    });

    test('自分のフォルダにはアップロード・削除できる', async ({ testUser }) => {
      const client = await createUserClient(testUser);
      const path = `${testUser.id}/${Date.now()}.png`;
      const { error } = await client.storage.from(bucket).upload(path, PNG, upload);
      expect(error).toBeNull();
      uploaded.push(path);

      const { data: removed, error: removeError } = await client.storage.from(bucket).remove([path]);
      expect(removeError).toBeNull();
      expect(removed).toHaveLength(1);
      uploaded.splice(uploaded.indexOf(path), 1);
    });
  });
}

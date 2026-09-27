// フォロー関係のRLS（非公開アカウントの承認制をDBで強制できていること）の検証
// 画面は正しいステータスしか送らないため、APIを直接叩いて不正な操作が拒否されることを確認する
import type { SupabaseClient } from '@supabase/supabase-js';
import { test, expect } from '../../helpers/fixtures';
import { createSupabaseAdmin } from '../../helpers/supabaseAdmin';
import { createTestUser, deleteTestUser, type TestUser } from '../../helpers/testUser';
import { createUserClient } from '../../helpers/userClient';

type Setup = {
  target: TestUser;
  targetClient: SupabaseClient;
  followerClient: SupabaseClient;
  logId: string;
  materialId: string;
};

// testUser = フォローする側。フォローされる側（target）は非公開アカウントとし、記録と教材を1件ずつ持たせる
async function setup(testUser: TestUser): Promise<Setup> {
  const admin = createSupabaseAdmin();
  const target = await createTestUser();

  const { error: profileError } = await admin.from('profiles').update({ is_public: false }).eq('id', target.id);
  if (profileError) throw profileError;

  const { data: material, error: materialError } = await admin.from('materials')
    .insert({ user_id: target.id, title: `非公開教材-${target.id}`, image_url: '/images/templates/book_blue.png' })
    .select('id').single();
  if (materialError) throw materialError;

  const { data: log, error: logError } = await admin.from('study_logs')
    .insert({ user_id: target.id, material_id: material.id, study_datetime: new Date().toISOString(), duration_minutes: 30 })
    .select('id').single();
  if (logError) throw logError;

  return {
    target,
    targetClient: await createUserClient(target),
    followerClient: await createUserClient(testUser),
    logId: log.id,
    materialId: material.id,
  };
}

async function followStatus(followerId: string, targetId: string): Promise<string | null> {
  const { data, error } = await createSupabaseAdmin().from('follows')
    .select('status').eq('follower_id', followerId).eq('following_id', targetId).maybeSingle();
  if (error) throw error;
  return data?.status ?? null;
}

async function canSeeLog(client: SupabaseClient, logId: string): Promise<boolean> {
  const { data, error } = await client.from('study_logs').select('id').eq('id', logId);
  if (error) throw error;
  return data.length === 1;
}

async function canSeeMaterial(client: SupabaseClient, materialId: string): Promise<boolean> {
  const { data, error } = await client.from('materials').select('id').eq('id', materialId);
  if (error) throw error;
  return data.length === 1;
}

test.describe('非公開アカウントへのフォロー', () => {
  let s: Setup;
  // このテストの beforeEach で作成した target。beforeEach が失敗したときに前のテストの（削除済みの）target を再削除しないよう分けて持つ
  let targetId: string | undefined;

  test.beforeEach(async ({ testUser }) => {
    s = await setup(testUser);
    targetId = s.target.id;
  });

  test.afterEach(async () => {
    const id = targetId;
    targetId = undefined;
    if (id) await deleteTestUser(id);
  });

  test('承認前は記録・教材が見えない', async () => {
    expect(await canSeeLog(s.followerClient, s.logId)).toBe(false);
    expect(await canSeeMaterial(s.followerClient, s.materialId)).toBe(false);
  });

  test('いきなり accepted でフォローを作成できない', async ({ testUser }) => {
    const { error } = await s.followerClient.from('follows')
      .insert({ follower_id: testUser.id, following_id: s.target.id, status: 'accepted' });

    expect(error).not.toBeNull();
    expect(await followStatus(testUser.id, s.target.id)).toBeNull();
    expect(await canSeeLog(s.followerClient, s.logId)).toBe(false);
  });

  test('申請者が自分の申請を accepted に書き換えられない', async ({ testUser }) => {
    const { error: insertError } = await s.followerClient.from('follows')
      .insert({ follower_id: testUser.id, following_id: s.target.id, status: 'pending' });
    expect(insertError).toBeNull();

    await s.followerClient.from('follows')
      .update({ status: 'accepted' }).eq('follower_id', testUser.id).eq('following_id', s.target.id);

    expect(await followStatus(testUser.id, s.target.id)).toBe('pending');
    expect(await canSeeLog(s.followerClient, s.logId)).toBe(false);
  });

  test('承認された側がフォロー元を別ユーザーに付け替えられない', async ({ testUser }) => {
    const other = await createTestUser();
    try {
      await s.followerClient.from('follows')
        .insert({ follower_id: testUser.id, following_id: s.target.id, status: 'pending' });

      await s.targetClient.from('follows')
        .update({ follower_id: other.id }).eq('follower_id', testUser.id).eq('following_id', s.target.id);

      expect(await followStatus(testUser.id, s.target.id)).toBe('pending');
      expect(await followStatus(other.id, s.target.id)).toBeNull();
    } finally {
      await deleteTestUser(other.id);
    }
  });

  test('相手が承認すると記録・教材が見える', async ({ testUser }) => {
    await s.followerClient.from('follows')
      .insert({ follower_id: testUser.id, following_id: s.target.id, status: 'pending' });

    const { error } = await s.targetClient.from('follows')
      .update({ status: 'accepted' }).eq('follower_id', testUser.id).eq('following_id', s.target.id);
    expect(error).toBeNull();

    expect(await followStatus(testUser.id, s.target.id)).toBe('accepted');
    expect(await canSeeLog(s.followerClient, s.logId)).toBe(true);
    expect(await canSeeMaterial(s.followerClient, s.materialId)).toBe(true);
  });
});

test.describe('公開アカウントへのフォロー', () => {
  test('accepted で直接フォローできる', async ({ testUser }) => {
    const target = await createTestUser();
    try {
      const client = await createUserClient(testUser);
      const { error } = await client.from('follows')
        .insert({ follower_id: testUser.id, following_id: target.id, status: 'accepted' });

      expect(error).toBeNull();
      expect(await followStatus(testUser.id, target.id)).toBe('accepted');
    } finally {
      await deleteTestUser(target.id);
    }
  });

  test('他人になりすましてフォローを作成できない', async ({ testUser }) => {
    const [target, victim] = [await createTestUser(), await createTestUser()];
    try {
      const client = await createUserClient(testUser);
      const { error } = await client.from('follows')
        .insert({ follower_id: victim.id, following_id: target.id, status: 'accepted' });

      expect(error).not.toBeNull();
      expect(await followStatus(victim.id, target.id)).toBeNull();
    } finally {
      await deleteTestUser(target.id);
      await deleteTestUser(victim.id);
    }
  });

  test('自分自身をフォローできない', async ({ testUser }) => {
    const client = await createUserClient(testUser);
    const { error } = await client.from('follows')
      .insert({ follower_id: testUser.id, following_id: testUser.id, status: 'accepted' });

    expect(error).not.toBeNull();
  });
});

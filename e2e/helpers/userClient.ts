// 指定ユーザーとしてログインした、anon key のSupabaseクライアント（RLSの検証用。Node側のみで使う）
// アプリ（ブラウザ）と同じ権限でAPIを直接叩けるため、画面からは行えない不正な操作がDBで拒否されることを検証できる
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requiredEnv, requiredLocalUrl } from './env';
import type { TestUser } from './testUser';

export function createAnonClient(): SupabaseClient {
  return createClient(requiredLocalUrl('VITE_SUPABASE_URL'), requiredEnv('VITE_SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createUserClient(user: TestUser): Promise<SupabaseClient> {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`テストユーザーのログインに失敗しました (${user.id}): ${error.message}`);
  return client;
}

// service role keyでDBを直接操作するクライアント（テストデータの準備・削除用。Node側のみで使う）
import { createClient } from '@supabase/supabase-js';
import { requiredEnv, requiredLocalUrl } from './env';

export function createSupabaseAdmin() {
  const url = requiredLocalUrl('E2E_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('E2E_SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

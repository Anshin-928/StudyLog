// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Supabaseとの通信用トランシーバー（DB型付き）
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// ログイン中のユーザーを、ブラウザに保存しているセッションから返す（未ログインは null）。
// supabase.auth.getUser() は呼ぶたびに Auth サーバーへ問い合わせ、同時に呼んでも1つずつ順に処理されるため、
// 1つの画面で何度も呼ぶと表示が遅くなる。クエリに使う user.id を知りたいだけならこちらを使う
// （他人のデータに触れられないことは、サーバーが毎回 JWT を検証したうえで RLS が保証する）。
// パスワード変更のように、サーバーで本人を確かめてから行う操作では getUser() を使う
export async function getSessionUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

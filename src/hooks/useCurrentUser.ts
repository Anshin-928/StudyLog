// src/hooks/useCurrentUser.ts
// ログイン中ユーザーIDの取得フック

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/** ログイン中ユーザーのIDを返す（取得前・未ログインは null） */
export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);
  return userId;
}

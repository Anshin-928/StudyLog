// src/lib/followsApi.ts
// フォロー関係のDB操作（Profile / Users 共通）

import { supabase } from './supabase';

export type FollowStatus = 'none' | 'pending' | 'accepted';

/** フォロー解除（申請キャンセル含む） */
export async function unfollow(myId: string, targetId: string): Promise<void> {
  const { error } = await supabase.from('follows')
    .delete().eq('follower_id', myId).eq('following_id', targetId);
  if (error) throw error;
}

/**
 * 新規フォロー。相手が非公開なら申請（pending）として作成する。
 * 作成されたステータスを返す。
 */
export async function follow(myId: string, targetId: string, targetIsPublic: boolean): Promise<FollowStatus> {
  const status: FollowStatus = targetIsPublic ? 'accepted' : 'pending';
  const { error } = await supabase.from('follows')
    .insert({ follower_id: myId, following_id: targetId, status });
  if (error) throw error;
  return status;
}

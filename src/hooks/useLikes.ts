// src/hooks/useLikes.ts
// いいねの取得・トグル（楽観的更新）ロジック

import { useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface LikesInfo {
  /** study_log_id → いいね件数 */
  countMap: Record<string, number>;
  /** 自分がいいね済みの study_log_id 集合 */
  mySet: Set<string>;
}

/** 表示中ログのいいね件数と自分のいいね状態をまとめて取得する */
export async function fetchLikes(logIds: string[], userId: string): Promise<LikesInfo> {
  const countMap: Record<string, number> = {};
  const mySet = new Set<string>();
  if (logIds.length === 0) return { countMap, mySet };
  const { data: likes } = await supabase
    .from('likes').select('study_log_id, user_id').in('study_log_id', logIds);
  (likes ?? []).forEach((l: any) => {
    countMap[l.study_log_id] = (countMap[l.study_log_id] ?? 0) + 1;
    if (l.user_id === userId) mySet.add(l.study_log_id);
  });
  return { countMap, mySet };
}

/**
 * いいねのトグル処理を返すフック。
 * applyUpdate で呼び出し側のリスト状態を楽観的に更新し、DB操作が失敗したらロールバックする。
 */
export function useLikeToggle(
  myId: string | null,
  applyUpdate: (logId: string, delta: number, likedByMe: boolean) => void,
) {
  const processing = useRef<Set<string>>(new Set());

  return useCallback(async (logId: string, likedByMe: boolean) => {
    if (!myId || processing.current.has(logId)) return;
    processing.current.add(logId);
    applyUpdate(logId, likedByMe ? -1 : 1, !likedByMe);
    try {
      if (likedByMe) {
        const { error } = await supabase.from('likes')
          .delete().eq('user_id', myId).eq('study_log_id', logId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes')
          .insert({ user_id: myId, study_log_id: logId });
        // 23505 = 重複（すでにいいね済み）は成功扱い
        if (error && error.code !== '23505') throw error;
      }
    } catch (e) {
      console.error(e);
      applyUpdate(logId, likedByMe ? 1 : -1, likedByMe);
    } finally {
      processing.current.delete(logId);
    }
  }, [myId, applyUpdate]);
}

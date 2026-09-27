// src/lib/studyLogImages.ts
// 勉強記録に添付する画像のアップロード（Record / EditRecordDialog 共通）

import { supabase } from './supabase';
import { safeImageExt } from './imageValidation';

/** study-logs バケットの `<ユーザーID>/` 配下へアップロードし、公開URLを返す（RLSで自分のフォルダにのみ書き込める） */
export async function uploadStudyLogImage(userId: string, image: File): Promise<string> {
  const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${safeImageExt(image)}`;
  const { error } = await supabase.storage
    .from('study-logs').upload(filePath, image);
  if (error) throw error;
  return supabase.storage.from('study-logs').getPublicUrl(filePath).data.publicUrl;
}

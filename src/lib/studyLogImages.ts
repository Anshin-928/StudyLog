// src/lib/studyLogImages.ts
// 勉強記録に添付する画像のアップロード（Record / EditRecordDialog 共通）

import { supabase } from './supabase';
import { safeImageExt } from './imageValidation';

/** study-logs バケットへアップロードし、公開URLを返す */
export async function uploadStudyLogImage(image: File): Promise<string> {
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${safeImageExt(image)}`;
  const { error } = await supabase.storage
    .from('study-logs').upload(`public/${fileName}`, image);
  if (error) throw error;
  return supabase.storage.from('study-logs').getPublicUrl(`public/${fileName}`).data.publicUrl;
}

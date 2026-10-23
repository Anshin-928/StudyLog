// src/features/record/studyLogImages.ts
// 勉強記録に添付する画像のアップロード・削除（RecordPage / EditRecordDialog 共通）

import { supabase } from '../../lib/supabase';
import { safeImageExt } from '../../lib/imageValidation';

const BUCKET = 'study-logs';

export type UploadedStudyLogImage = {
  /** バケット内のパス（削除に使う） */
  path: string;
  /** 記録の image_url に保存する公開URL */
  publicUrl: string;
};

/** study-logs バケットの `<ユーザーID>/` 配下へアップロードする（RLSで自分のフォルダにのみ書き込める） */
export async function uploadStudyLogImage(
  userId: string,
  image: File,
): Promise<UploadedStudyLogImage> {
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${safeImageExt(image)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, image);
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

/**
 * 記録の image_url（公開URL）からバケット内のパスを取り出す。
 * このバケットの公開URLでなければ null（DBにはURLしか残っていないので、差し替え前の画像を消すときに使う）
 */
export function studyLogImagePathFromUrl(publicUrl: string): string | null {
  const prefix = supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;
  if (!publicUrl.startsWith(prefix)) return null;
  const path = publicUrl.slice(prefix.length).split(/[?#]/)[0];
  if (!path) return null;
  // 壊れた % を含む URL では decodeURI が投げる。記録の削除・更新が成功した後の後始末で呼ばれるので、
  // 投げると成功した操作が失敗として表示される。パスを特定できない画像は消さない
  try {
    return decodeURI(path);
  } catch {
    return null;
  }
}

/**
 * どこからも参照されなくなった画像を消す。後始末なので失敗しても投げない。
 * 画面の操作を待たせないよう、呼び出し側は完了を待たずに void で呼ぶ
 */
export async function removeStudyLogImage(path: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.error('画像の削除エラー:', error);
    // 権限がなくて消せなかったときは、エラーにならず0件削除になるので、それも記録する
    else if (data.length === 0) console.error('画像を削除できませんでした（0件削除）:', path);
  } catch (e) {
    // SDK は通常 { error } を返すが、中で投げることもある。void で呼ばれるので、投げると処理されない reject が残る
    console.error('画像の削除エラー:', e);
  }
}

/**
 * どこからも参照されなくなった記録の画像を、記録に保存されていた公開URLから消す（完了を待たない）。
 * URL が無い・このバケットの画像でないときは何もしない
 */
export function removeStudyLogImageByUrl(publicUrl: string | null): void {
  const path = publicUrl && studyLogImagePathFromUrl(publicUrl);
  if (path) void removeStudyLogImage(path);
}

/**
 * 記録の保存・更新が { error } で返ってきたとき、サーバーが確実に処理しなかったなら、今回アップロードした画像を消す。
 * 通信エラー（status 0）や 5xx、408（タイムアウト）・499（接続が途中で切れた）は、
 * サーバー側では保存できていて応答だけ届かなかった可能性があるので消さない。
 * そのときに消すと、保存済みの記録が消えた画像を指してしまう
 */
export function removeUploadedImageIfRejected(
  uploaded: UploadedStudyLogImage | null,
  status: number,
): void {
  const rejected = status >= 400 && status < 500 && status !== 408 && status !== 499;
  if (uploaded && rejected) void removeStudyLogImage(uploaded.path);
}

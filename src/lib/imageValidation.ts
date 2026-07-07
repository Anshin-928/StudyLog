// src/lib/imageValidation.ts

// アップロードを許可する画像MIMEタイプと、保存時に使う拡張子の対応表
// （ファイル名由来の拡張子は偽装できるため信用しない）
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * 画像ファイルを検証し、問題があればエラーメッセージを返す（問題なければ null）
 */
export function validateImageFile(file: File): string | null {
  if (!(file.type in MIME_TO_EXT)) {
    return 'JPG・PNG・WebP・GIF形式のみ対応しています';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'ファイルサイズは10MB以下にしてください';
  }
  return null;
}

/**
 * MIMEタイプから安全な拡張子を返す（validateImageFile 通過後に使うこと）
 */
export function safeImageExt(file: File): string {
  return MIME_TO_EXT[file.type] ?? 'jpg';
}

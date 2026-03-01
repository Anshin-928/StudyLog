// src/lib/compressImage.ts
import imageCompression from 'browser-image-compression';

/**
 * 画像を圧縮する共通ユーティリティ
 * - 最大 1MB・最大幅 1024px に自動リサイズ
 * - アップロード前に呼び出すだけでOK
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,          // 最大1MB
    maxWidthOrHeight: 1024, // 最大幅・高さ 1024px
    useWebWorker: true,     // バックグラウンドで処理してUIをブロックしない
  };
  return await imageCompression(file, options);
}
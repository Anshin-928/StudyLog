// 学習記録の画像（Storage の study-logs バケット）のテストデータの準備・確認・削除
// Storage のファイルはユーザー削除では消えないため、fixtures.ts の studyLogImages fixture で
// テスト終了時（成功・失敗を問わず）にユーザーのフォルダごと削除する
import { createSupabaseAdmin } from './supabaseAdmin';
import type { TestUser } from './testUser';
import { createAnonClient, createUserClient } from './userClient';

const BUCKET = 'study-logs';

// 1x1 の透過PNG
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export type StudyLogImage = {
  // バケット内のパス（<ユーザーID>/<ファイル名>）
  path: string;
  // 記録の image_url に保存する公開URL
  publicUrl: string;
};

let adminClient: ReturnType<typeof createSupabaseAdmin> | null = null;
function getAdmin() {
  adminClient ??= createSupabaseAdmin();
  return adminClient;
}

// 公開URLはアプリと同じ接続先（VITE_SUPABASE_URL）で作る。
// アプリはこの接続先で作ったURLの形からパスを取り出して消すため、形が違うと消す対象にならない
export function studyLogImagePublicUrl(path: string): string {
  return createAnonClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// 公開URLからバケット内のパスを取り出す（このバケットの公開URLでなければ null）
export function studyLogImagePathFromPublicUrl(publicUrl: string): string | null {
  const prefix = studyLogImagePublicUrl('');
  return publicUrl.startsWith(prefix) ? decodeURI(publicUrl.slice(prefix.length)) : null;
}

// ユーザーのフォルダに画像を1つ直接アップロードする（記録に付いている画像を用意する）
// アプリと同じく本人としてアップロードする。削除のポリシーはアップロードした本人（owner_id）にだけ削除を許すため、
// service role でアップロードすると owner_id が空になり、アプリから消せない画像になってしまう
export async function uploadStudyLogImage(user: TestUser, name: string): Promise<StudyLogImage> {
  const path = `${user.id}/${name}.png`;
  const client = await createUserClient(user);
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, PNG, { contentType: 'image/png' });
  if (error) throw new Error(`テスト画像のアップロードに失敗しました: ${error.message}`);
  return { path, publicUrl: studyLogImagePublicUrl(path) };
}

// ユーザーのフォルダにある画像のパスをすべて返す
export async function listStudyLogImagePaths(userId: string): Promise<string[]> {
  const { data, error } = await getAdmin().storage.from(BUCKET).list(userId, { limit: 1000 });
  if (error) throw new Error(`テスト画像の一覧の取得に失敗しました: ${error.message}`);
  return data.map((file) => `${userId}/${file.name}`);
}

// 画像が Storage にあるか
export async function studyLogImageExists(path: string): Promise<boolean> {
  const userId = path.split('/')[0];
  return (await listStudyLogImagePaths(userId)).includes(path);
}

// ユーザーのフォルダにある画像をすべて削除し、残っていないことまで確かめる
export async function removeAllStudyLogImages(userId: string): Promise<void> {
  const paths = await listStudyLogImagePaths(userId);
  if (paths.length > 0) {
    const { error } = await getAdmin().storage.from(BUCKET).remove(paths);
    if (error) throw new Error(`テスト画像の削除に失敗しました: ${error.message}`);
  }
  const remaining = await listStudyLogImagePaths(userId);
  if (remaining.length > 0) {
    throw new Error(`テスト画像が ${remaining.length} 件削除できずに残っています (${userId})`);
  }
}

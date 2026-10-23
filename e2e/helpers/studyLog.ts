// 学習記録（study_logs）のテストデータの準備・確認
// 記録はユーザーに紐づくため、testUser / createTestUser() のユーザー削除時に ON DELETE CASCADE で消える
import { createSupabaseAdmin } from './supabaseAdmin';

// 呼び出しのたびにクライアントを作らないよう、最初に使うときに1つだけ作って使い回す
let adminClient: ReturnType<typeof createSupabaseAdmin> | null = null;
function getAdmin() {
  adminClient ??= createSupabaseAdmin();
  return adminClient;
}

type StudyLogInput = {
  memo: string;
  // 省略時は現在時刻
  studyDatetime?: Date;
  durationMinutes?: number | null;
  // 省略時は教材なし
  materialId?: string | null;
};

export type StudyLogRow = {
  id: string;
  memo: string | null;
  duration_minutes: number | null;
  image_url: string | null;
};

// 記録を1件作成し、そのIDを返す
export async function createStudyLog(userId: string, input: StudyLogInput): Promise<string> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('study_logs')
    .insert({
      user_id: userId,
      material_id: input.materialId ?? null,
      study_datetime: (input.studyDatetime ?? new Date()).toISOString(),
      duration_minutes: input.durationMinutes ?? null,
      memo: input.memo,
    })
    .select('id')
    .single();
  if (error) throw new Error(`記録の作成に失敗しました: ${error.message}`);
  return data.id;
}

// 記録をDBから直接削除する（画面を開いた後に別の端末で消された状況を作る）
export async function deleteStudyLog(id: string): Promise<void> {
  const admin = getAdmin();
  const { error } = await admin.from('study_logs').delete().eq('id', id);
  if (error) throw new Error(`記録の削除に失敗しました: ${error.message}`);
}

// 記録の画像のURLをDBで直接書き換える（画面を開いた後に別の端末で画像を差し替えられた状況を作る）
export async function setStudyLogImageUrl(id: string, imageUrl: string | null): Promise<void> {
  const admin = getAdmin();
  const { error } = await admin.from('study_logs').update({ image_url: imageUrl }).eq('id', id);
  if (error) throw new Error(`記録の画像の書き換えに失敗しました: ${error.message}`);
}

// 記録をDBから直接取得する（存在しなければ null）
export async function findStudyLog(id: string): Promise<StudyLogRow | null> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('study_logs')
    .select('id, memo, duration_minutes, image_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`記録の取得に失敗しました: ${error.message}`);
  return data;
}

// 記録に付ける教材を1件作成し、そのIDを返す（カテゴリなし・使用中の教材。ユーザー削除時に ON DELETE CASCADE で消える）
export async function createMaterial(userId: string, title: string): Promise<string> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('materials')
    .insert({ user_id: userId, title, image_url: '', status: 'active' })
    .select('id')
    .single();
  if (error) throw new Error(`教材の作成に失敗しました: ${error.message}`);
  return data.id;
}

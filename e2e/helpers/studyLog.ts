// 学習記録（study_logs）のテストデータの準備・確認
// 記録はユーザーに紐づくため、testUser / createTestUser() のユーザー削除時に ON DELETE CASCADE で消える
import { createSupabaseAdmin } from './supabaseAdmin';

type StudyLogInput = {
  memo: string;
  // 省略時は現在時刻
  studyDatetime?: Date;
  durationMinutes?: number | null;
};

export type StudyLogRow = {
  id: string;
  memo: string | null;
  duration_minutes: number | null;
};

// 教材なしの記録を1件作成し、そのIDを返す
export async function createStudyLog(userId: string, input: StudyLogInput): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('study_logs')
    .insert({
      user_id: userId,
      material_id: null,
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
  const admin = createSupabaseAdmin();
  const { error } = await admin.from('study_logs').delete().eq('id', id);
  if (error) throw new Error(`記録の削除に失敗しました: ${error.message}`);
}

// 記録をDBから直接取得する（存在しなければ null）
export async function findStudyLog(id: string): Promise<StudyLogRow | null> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('study_logs')
    .select('id, memo, duration_minutes')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`記録の取得に失敗しました: ${error.message}`);
  return data;
}

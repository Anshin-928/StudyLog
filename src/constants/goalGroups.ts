// src/constants/goalGroups.ts

export type GoalCategory = 'high_school' | 'university' | 'qualification' | 'language' | 'other';

export const GOAL_CATEGORIES: { id: GoalCategory; label: string }[] = [
  { id: 'high_school',   label: '高校受験' },
  { id: 'university',    label: '大学受験' },
  { id: 'qualification', label: '資格・検定' },
  { id: 'language',      label: '語学' },
  { id: 'other',         label: 'その他' },
];

// 学校データ（約1MB）はバンドルに含めず、必要になったときに /data/schools.json から取得する
interface School {
  code: string;
  name: string;
  prefecture: string;
  address: string;
}
interface SchoolData {
  updatedAt: string;
  highSchools: School[];
  universities: School[];
}

let schoolDataPromise: Promise<SchoolData> | null = null;

function fetchSchoolData(): Promise<SchoolData> {
  if (!schoolDataPromise) {
    schoolDataPromise = fetch('/data/schools.json').then((res) => {
      if (!res.ok) throw new Error(`Failed to load school data: ${res.status}`);
      return res.json();
    });
    // 失敗したら次回また取得できるようにキャッシュを捨てる
    schoolDataPromise.catch(() => { schoolDataPromise = null; });
  }
  return schoolDataPromise;
}

// カテゴリごとのサジェスト候補（学校系は取得後にマージされる）
export async function getGoalSuggestions(category: GoalCategory): Promise<string[]> {
  if (category === 'high_school') {
    const data = await fetchSchoolData();
    return data.highSchools.map((s) => s.name);
  }
  if (category === 'university') {
    const data = await fetchSchoolData();
    return [...data.universities.map((s) => s.name), '医学部医学科'];
  }
  return GOAL_GROUP_SUGGESTIONS[category];
}

export const GOAL_GROUP_SUGGESTIONS: Record<GoalCategory, string[]> = {
  high_school: [],
  university: ['医学部医学科'],
  qualification: [
    // 法律・会計
    '司法試験', '司法書士', '行政書士', '公認会計士', '税理士',
    '社会保険労務士', '中小企業診断士', '宅地建物取引士', 'ファイナンシャルプランナー2級', 'ファイナンシャルプランナー3級',
    // 簿記
    '簿記1級', '簿記2級', '簿記3級',
    // IT系
    'ITパスポート', '基本情報技術者', '応用情報技術者',
    'ネットワークスペシャリスト', 'データベーススペシャリスト',
    '情報処理安全確保支援士', 'プロジェクトマネージャ',
    'AWS 認定ソリューションアーキテクト', 'Oracle認定Javaプログラマ',
    // その他
    '医師国家試験', '薬剤師国家試験', '看護師国家試験',
    '管理栄養士', '保育士', '教員免許',
    '危険物取扱者乙種4類', '電気工事士2種',
  ],
  language: [
    // TOEIC
    'TOEIC 990点', 'TOEIC 900点', 'TOEIC 800点', 'TOEIC 700点',
    'TOEIC 600点', 'TOEIC 500点',
    // 英検
    '英検1級', '英検準1級', '英検2級', '英検準2級', '英検3級',
    // TOEFL・IELTS
    'TOEFL iBT 100点以上', 'IELTS 7.0以上',
    // 中国語
    '中国語検定1級', '中国語検定2級', '中国語検定3級', 'HSK6級', 'HSK5級',
    // 韓国語
    'TOPIK II 6級', 'TOPIK II 5級', 'TOPIK II 4級',
    // フランス語・ドイツ語など
    'DELF B2', 'DELF B1', 'ドイツ語検定2級',
    '日本語能力試験 N1', '日本語能力試験 N2',
  ],
  other: [
    '公務員試験（国家一般職）', '公務員試験（国家総合職）', '公務員試験（地方上級）',
    '大学院入試', 'MBA取得',
    '数学オリンピック', '競技プログラミング',
    '英語の勉強', 'プログラミング学習', '読書習慣をつける',
  ],
};
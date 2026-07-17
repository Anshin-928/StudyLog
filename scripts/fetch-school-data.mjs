/**
 * edu-data.jp API から高校・大学の学校データを取得し、JSONファイルに保存するスクリプト
 *
 * 使い方:
 *   EDU_DATA_TOKEN=<your_token> node scripts/fetch-school-data.mjs
 *
 * トークン取得: https://api.edu-data.jp/token
 */

const API_BASE = "https://api.edu-data.jp/api/v1/school";

const SCHOOL_TYPES = [
  { code: "D1", label: "高等学校" },
  { code: "F1", label: "大学" },
];

const token = process.env.EDU_DATA_TOKEN;
if (!token) {
  console.error("EDU_DATA_TOKEN 環境変数を設定してください");
  process.exit(1);
}

async function main() {
  console.log("学校データの取得を開始...");

  const results = {};

  for (const { code, label } of SCHOOL_TYPES) {
    console.log(`${label}（${code}）を取得中...`);

    // ページネーション対応: data.schools はLaravelのPaginatedレスポンス
    let allSchools = [];
    let page = 1;
    let lastPage = 1;

    do {
      const url = `${API_BASE}?school_type_code=${code}&page=${page}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`API error (${code}, page ${page}): ${res.status}`);
      }
      const json = await res.json();
      const paginated = json.schools;
      lastPage = paginated.last_page;
      allSchools = allSchools.concat(paginated.data);
      console.log(`  ページ ${page}/${lastPage} (${paginated.data.length} 件)`);
      page++;
    } while (page <= lastPage);

    results[code] = allSchools.map((s) => ({
      code: s.school_code,
      name: s.school_name,
      prefecture: s.pref,
      address: s.school_locate_at,
    }));

    console.log(`  ${results[code].length} 件取得`);
  }

  const output = {
    updatedAt: new Date().toISOString().split("T")[0],
    highSchools: results["D1"],
    universities: results["F1"],
  };

  const fs = await import("node:fs");
  const path = await import("node:path");
  const outPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "public",
    "data",
    "schools.json"
  );

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`保存完了: ${outPath}`);
  console.log(
    `高校: ${output.highSchools.length} 件 / 大学: ${output.universities.length} 件`
  );
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});

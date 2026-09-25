// e2e用の環境変数の読み出しと、接続先がローカルであることの保証

const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が設定されていません。.env.e2e.local を確認してください。`);
  }
  return value;
}

// 本番Supabaseに向いたままテストが走る事故を防ぐ。ローカル以外なら即座に中断する
export function requiredLocalUrl(name: string): string {
  const value = requiredEnv(name);
  const { hostname } = new URL(value);
  if (!LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`${name}=${value} はローカルではありません。e2eはローカルSupabaseでのみ実行できます。`);
  }
  return value;
}

// 2つのURLが同じSupabaseを指していることを保証する（localhost と 127.0.0.1 は同一視する）
// テストが作成・削除するユーザーと、アプリが参照するユーザーが別DBになる事故を防ぐ
export function assertSameSupabase(nameA: string, nameB: string): void {
  const normalize = (value: string) => {
    const url = new URL(value);
    const host = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
    return `${url.protocol}//${host}:${url.port}`;
  };
  const a = requiredLocalUrl(nameA);
  const b = requiredLocalUrl(nameB);
  if (normalize(a) !== normalize(b)) {
    throw new Error(`${nameA}=${a} と ${nameB}=${b} が別のSupabaseを指しています。同じ接続先にしてください。`);
  }
}

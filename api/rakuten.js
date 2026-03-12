// api/rakuten.js

import { createClient } from '@supabase/supabase-js';

// フロントエンドから受け取ってよいパラメータのみを許可する（それ以外は無視）
const ALLOWED_PARAMS = new Set(['format', 'title', 'author', 'hits', 'page', 'sort', 'outOfStockFlag']);

export default async function handler(req, res) {
  // GET のみ受け付ける
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 許可オリジンからのリクエストのみ受け付ける
  const origin = req.headers['origin'];
  if (origin && origin !== 'https://studylog-app.com') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 環境変数の存在確認
  if (!process.env.RAKUTEN_APP_ID) {
    console.error('[rakuten] RAKUTEN_APP_ID is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ---- 認証チェック ----
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ---- パラメータホワイトリスト ----
  const params = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    if (req.query[key] !== undefined) {
      const value = (key === 'title' || key === 'author')
        ? String(req.query[key]).slice(0, 100)
        : String(req.query[key]);
      params.set(key, value);
    }
  }

  if (!params.get('title') && !params.get('author')) {
    return res.status(400).json({ error: 'title or author is required' });
  }

  params.set('applicationId', process.env.RAKUTEN_APP_ID);
  if (process.env.RAKUTEN_ACCESS_KEY) {
    params.set('accessKey', process.env.RAKUTEN_ACCESS_KEY);
  }

  const url = `https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://studylog-app.com/',
        'Origin': 'https://studylog-app.com/',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      console.error('[rakuten] Invalid JSON response');
      return res.status(500).json({ error: 'Invalid API response', Items: [] });
    }

    if (!response.ok) {
      console.error('[rakuten] API error:', response.status);
      return res.status(response.status).json({ error: 'Search API error', Items: [] });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('[rakuten] fetch failed:', err);
    res.status(500).json({ error: 'fetch failed' });
  }
}

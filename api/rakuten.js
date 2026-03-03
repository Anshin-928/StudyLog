// api/rakuten.js

export default async function handler(req, res) {
  const params = new URLSearchParams(req.query).toString();
  const url = `https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params}`;

  try {
    const response = await fetch(url); // サーバーから叩く → Referer/Originなし
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed' });
  }
}
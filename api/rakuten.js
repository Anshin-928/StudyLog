// api/rakuten.js

export default async function handler(req, res) {
  const params = new URLSearchParams(req.query);
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
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed' });
  }
}
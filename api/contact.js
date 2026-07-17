// api/contact.js

import { createClient } from '@supabase/supabase-js';

const CATEGORIES = {
  bug: '不具合の報告',
  feature: '機能の要望',
  privacy: '個人情報について',
  other: 'その他',
};

const MAX_MESSAGE_LENGTH = 2000;
// 短時間の連投を防ぐ（5分間に3件まで）
const RATE_LIMIT_COUNT = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers['origin'];
  if (origin && origin !== 'https://studylog-app.com') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ---- 認証チェック ----
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ユーザーのトークンで動くクライアント（RLS がそのまま効く）
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ---- 入力バリデーション ----
  const { category, message } = req.body ?? {};

  if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  if (!trimmedMessage || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  // ---- レート制限 ----
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error: countError } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart);

  if (countError) {
    console.error('[contact] rate limit check failed:', countError);
    return res.status(500).json({ error: 'Server error' });
  }
  if ((count ?? 0) >= RATE_LIMIT_COUNT) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // ---- 保存 ----
  const { data: inquiry, error: insertError } = await supabase
    .from('inquiries')
    .insert({ user_id: user.id, category, message: trimmedMessage })
    .select('id')
    .single();

  if (insertError) {
    console.error('[contact] insert failed:', insertError);
    return res.status(500).json({ error: 'Failed to save inquiry' });
  }

  // ---- 運営への通知メール（失敗しても問い合わせ自体は成立している）----
  if (process.env.RESEND_API_KEY && process.env.CONTACT_NOTIFY_TO) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM || 'StudyLog <noreply@studylog-app.com>',
          to: process.env.CONTACT_NOTIFY_TO,
          subject: `【StudyLog お問い合わせ】${CATEGORIES[category]}`,
          text: [
            `カテゴリ: ${CATEGORIES[category]}`,
            `ユーザー: ${user.email ?? '(メールなし)'}`,
            `ユーザーID: ${user.id}`,
            `問い合わせID: ${inquiry.id}`,
            '',
            '--- 本文 ---',
            trimmedMessage,
          ].join('\n'),
        }),
      });
      if (!response.ok) {
        console.error('[contact] notification email failed:', response.status, await response.text());
      }
    } catch (err) {
      console.error('[contact] notification email failed:', err);
    }
  }

  return res.status(200).json({ ok: true });
}

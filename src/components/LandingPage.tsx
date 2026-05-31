// src/components/LandingPage.tsx
// StudyLog ランディングページ。

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './LandingPage.css';

const logoUrl = '/images/lp/studylog-logo.svg';
const womanUrl = '/images/lp/woman-studying.webp';
const manUrl = '/images/lp/man-studying.webp';

export default function LandingPage() {
  const navigate = useNavigate();

  // すでにログイン済みならアプリ本体へ
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home', { replace: true });
    });
  }, [navigate]);

  // アイコンフォントの読み込み完了後にアイコンを表示
  useEffect(() => {
    const root = document.querySelector('.lp-root');
    const reveal = () => root?.classList.add('fonts-ready');
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reveal);
    }
    const fallback = setTimeout(reveal, 2000);
    return () => clearTimeout(fallback);
  }, []);

  const goAuth = () => navigate('/login');

  const ctaButton = (
    <button className="cta" onClick={goAuth}>
      <span className="cta-label">ログイン / 新規登録</span>
      <span className="cta-arrow">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12h14M12 6l6 6-6 6"
            stroke="#5b7ff8"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );

  return (
    <div className="lp-root">
      {/* HEADER */}
      <header>
        <div className="wrap">
          <div className="nav">
            <div className="logo">
              <img
                src={logoUrl}
                alt="StudyLog"
                style={{ width: 44, height: 46, margin: '0 0 0 -10px' }}
              />
              <span>StudyLog</span>
            </div>
            <button className="header-cta" onClick={goAuth}>ログイン / 新規登録</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        {/* decorative blobs */}
        <span className="blob" style={{ top: -40, left: '30%', width: 150, height: 120, background: 'linear-gradient(135deg,#cdb8ff,#9c8bff)', borderRadius: '58% 42% 47% 53%/55% 47% 53% 45%', opacity: 0.85 }} />
        <span className="blob" style={{ top: 40, right: '8%', width: 120, height: 110, background: 'linear-gradient(135deg,#5b8af8,#6d5ef6)', borderRadius: '46% 54% 38% 62%/52% 44% 56% 48%', opacity: 0.9 }} />
        <span className="blob" style={{ top: 300, right: -60, width: 230, height: 200, background: 'linear-gradient(135deg,#bdd0ff,#7aa8ff)', borderRadius: '60% 40% 53% 47%/48% 56% 44% 52%', opacity: 0.5 }} />
        <span className="blob" style={{ top: 430, left: -70, width: 200, height: 175, background: 'linear-gradient(135deg,#7b62f7,#5b8af8)', borderRadius: '52% 48% 60% 40%/55% 50% 50% 45%', opacity: 0.92 }} />
        <span className="dots" style={{ top: 430, right: '7%', width: 130, height: 130, color: '#aeb9f3', opacity: 0.8 }} />

        <div className="wrap">
          <div className="hero-grid">
            {/* left */}
            <div className="hero-copy">
              <div className="tagline">
                今日の一歩が、未来の自分をつくる。
                <svg viewBox="0 0 240 14" preserveAspectRatio="none">
                  <path d="M2 9 C 50 2, 120 13, 238 4" fill="none" stroke="#F1F445" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="headline">
                学習を記録して、
                <br />
                <span className="hl-blue ul-yellow">続く</span>自分に。
              </h1>
              <p className="lead" style={{ fontWeight: 500 }}>
                StudyLogは、学習時間・教材・進捗を可視化し、モチベーションを高めながら継続をサポートする学習管理アプリです。
              </p>

              {ctaButton}

              <div className="mini-feats">
                <div className="mini">
                  <span className="ic"><span className="material-icons-outlined">bar_chart</span></span>
                  <p>学習の記録と可視化</p>
                </div>
                <div className="mini">
                  <span className="ic"><span className="material-icons-outlined">groups</span></span>
                  <p>仲間とつながり<br />刺激を受ける</p>
                </div>
                <div className="mini">
                  <span className="ic"><span className="material-icons-outlined">local_fire_department</span></span>
                  <p>継続を支える<br />ストリーク機能</p>
                </div>
              </div>
            </div>

            {/* right visual */}
            <div className="hero-visual">
              <span className="blob" style={{ top: 90, left: -44, width: 60, height: 60, background: 'linear-gradient(135deg,#26d0c4,#3fb8ff)', borderRadius: '50%', opacity: 0.95, zIndex: 3 }} />
              <div className="photo-blob">
                <div className="blob-photo blob-woman">
                  <img src={womanUrl} alt="学習する女性" width={1200} height={900} fetchPriority="high" decoding="async" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="feats">
        <div className="band" aria-hidden="true">
          <div className="band-edge band-top">
            <svg viewBox="0 0 1440 40" preserveAspectRatio="none">
              <g className="wave-move">
                <path d="M0,22 C90,10 270,10 360,22 C450,34 630,34 720,22 C810,10 990,10 1080,22 C1170,34 1350,34 1440,22 C1530,10 1710,10 1800,22 C1890,34 2070,34 2160,22 C2250,10 2430,10 2520,22 C2610,34 2790,34 2880,22 L2880,40 L0,40 Z"></path>
              </g>
            </svg>
          </div>
          <div className="band-fill"></div>
          <div className="band-edge band-bottom">
            <svg viewBox="0 0 1440 40" preserveAspectRatio="none">
              <g className="wave-move">
                <path d="M0,0 L2880,0 L2880,18 C2790,30 2610,30 2520,18 C2430,6 2250,6 2160,18 C2070,30 1890,30 1800,18 C1710,6 1530,6 1440,18 C1350,30 1170,30 1080,18 C990,6 810,6 720,18 C630,30 450,30 360,18 C270,6 90,6 0,18 Z"></path>
              </g>
            </svg>
          </div>
        </div>
        <span className="dots" style={{ top: 64, right: '4%', width: 120, height: 120, color: '#9db4f5', opacity: 0.55 }} />
        <div className="wrap">
          <h2 className="sec-head" style={{ fontSize: 43 }}>StudyLog でできること</h2>
          <div className="feat-grid">
            <div className="feat">
              <span className="fic"><span className="material-icons-outlined">edit</span></span>
              <h3>学習を記録する</h3>
              <p>学習時間・ページ数・メモ・画像を簡単に記録。教材ごとに管理できます。</p>
            </div>
            <div className="feat">
              <span className="fic"><span className="material-icons-outlined">pie_chart</span></span>
              <h3>進捗を可視化する</h3>
              <p>グラフで自分の成長や得意・不得意をひと目で把握。</p>
            </div>
            <div className="feat">
              <span className="fic"><span className="material-icons-outlined">groups</span></span>
              <h3>仲間とつながる</h3>
              <p>フォローやタイムラインで、他の人の記録から刺激をもらえます。</p>
            </div>
            <div className="feat">
              <span className="fic"><span className="material-icons-outlined">local_fire_department</span></span>
              <h3>学習を継続</h3>
              <p>ストリーク機能や目標設定で、毎日の学習を継続。</p>
            </div>
            <div className="feat">
              <span className="fic"><span className="material-icons-outlined">menu_book</span></span>
              <h3>教材をまとめて管理</h3>
              <p>参考書や問題集を登録・分類。市販の新しい教材も簡単に追加できる。</p>
            </div>
          </div>
        </div>
      </section>

      {/* MOTIVATION */}
      <section className="moti">
        <span className="blob" style={{ bottom: -30, left: -80, width: 220, height: 190, background: 'linear-gradient(135deg,#7b62f7,#5b8af8)', borderRadius: '55% 45% 50% 50%/52% 50% 50% 48%', opacity: 0.9 }} />
        <span className="blob" style={{ top: 30, left: '14%', width: 34, height: 34, background: 'linear-gradient(135deg,#bdb0ff,#8c9bff)', borderRadius: '50%', opacity: 0.7 }} />
        <span className="dots" style={{ top: 0, left: '6%', width: 90, height: 90, color: '#9db4f5', opacity: 0.6 }} />
        <div className="wrap">
          <div className="moti-grid">
            {/* photo */}
            <div className="moti-photo">
              <span className="keep">Keep<br />going!</span>
              <span className="blob" style={{ bottom: 6, left: -30, width: 80, height: 70, background: 'linear-gradient(135deg,#26d0c4,#3fb8ff)', borderRadius: '50% 50% 55% 45%', opacity: 0.95, zIndex: 1 }} />
              <div className="blob-photo blob-man" style={{ position: 'relative', zIndex: 2 }}>
                <img src={manUrl} alt="学習する男性" width={1200} height={900} loading="lazy" decoding="async" />
              </div>
            </div>
            {/* copy */}
            <div className="moti-copy">
              <span className="study-smarter">Study <span className="y">smarter!</span></span>
              {/* sparkles */}
              <svg className="spark" style={{ top: -10, left: '62%', width: 30, height: 30 }} viewBox="0 0 24 24" fill="#F1F445"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" /></svg>
              <svg className="spark" style={{ top: -26, left: '74%', width: 18, height: 18 }} viewBox="0 0 24 24" fill="#F1F445"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" /></svg>

              <h2>
                小さな積み重ねが、
                <br />
                大きな<span className="hl-blue">自信</span>に変わる。
              </h2>
              <div className="checklist">
                <div className="chk"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4285F4" /><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>資格取得や受験に向けて計画的に勉強したい。</div>
                <div className="chk"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4285F4" /><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>自分の成長を実感してモチベーションを維持したい。</div>
                <div className="chk"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4285F4" /><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>一人だとサボってしまう…。誰かとつながって頑張りたい。</div>
                <div className="chk"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4285F4" /><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>たくさんの教材を効率よく管理したい。</div>
              </div>
              {ctaButton}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST FOOTER */}
      <footer>
        <div className="wrap">
          <div className="trust">
            <div className="trust-item">
              <span className="tic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 18a4 4 0 01-.5-7.97A5 5 0 0116.9 9.3 3.5 3.5 0 0117.5 18H7z" /></svg></span>
              <p><b>データはクラウドで安全に保管</b><span>いつでもどこでもアクセス可能</span></p>
            </div>
            <div className="trust-item">
              <span className="tic">
                <svg viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2.05H12v3.88h5.4a4.6 4.6 0 01-2 3.02v2.5h3.23c1.9-1.74 2.97-4.3 2.97-7.35z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.6-4.12H3.07v2.59A10 10 0 0012 22z" />
                  <path fill="#FBBC05" d="M6.4 13.9a6 6 0 010-3.82V7.5H3.07a10 10 0 000 9z" />
                  <path fill="#EA4335" d="M12 5.96c1.47 0 2.78.5 3.82 1.5l2.85-2.85A10 10 0 003.07 7.5L6.4 10.1C7.2 7.7 9.4 5.96 12 5.96z" />
                </svg>
              </span>
              <p><b>Googleアカウントで簡単ログイン</b></p>
            </div>
            <div className="trust-item">
              <span className="tic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7l1.5-2.5h3L15 7" /><circle cx="12" cy="13.5" r="3.2" /></svg></span>
              <p><b>プライバシー設定で</b><span>公開範囲を自由に管理</span></p>
            </div>
            <div className="trust-item">
              <span className="tic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 9.5L14 5v12L4 14.5v-5z" /><path d="M4 9.5H3v5h1M14 8c1.8 0 1.8 6 0 6" /><path d="M6.5 15v3.5h2.5" /></svg></span>
              <p><b>広告なしで</b><span>集中できる環境</span></p>
            </div>
          </div>
          <nav className="footer-links">
            <Link to="/terms">利用規約</Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy">プライバシーポリシー</Link>
          </nav>
          <p className="copy">© 2026 StudyLog</p>
        </div>
      </footer>
    </div>
  );
}

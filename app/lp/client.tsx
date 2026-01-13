'use client';

import { useEffect } from 'react';

export default function LPClient() {

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -80px 0px' }
    );

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const Img = ({ w, h, label, className = '' }: { w: string; h: string; label?: string; className?: string }) => (
    <div 
      className={`img-placeholder ${className}`}
      style={{ width: w, height: h }}
    >
      <span>{label || `${w}×${h}`}</span>
    </div>
  );

  return (
    <div className="wrapper">
      <aside className="side left"></aside>

      <main className="main">

        {/* ===== HERO ===== */}
        <div className="hero">
          <p className="hero-sub reveal">同人・創作クリエイターへ</p>
          <h1 className="hero-title reveal">
            <span>待っている人が</span>
            <span className="em">いる。</span>
          </h1>
          <div className="scroll-line reveal"></div>
        </div>

        {/* ===== IMAGE BURST ===== */}
        <div className="img-burst">
          <div className="burst-main reveal">
            <Img w="100%" h="400px" label="依頼が届いた瞬間&#10;スマホ通知・心が動く" />
          </div>
          <div className="burst-float reveal">
            <Img w="140px" h="140px" label="作品1" />
          </div>
          <div className="burst-float2 reveal">
            <Img w="100px" h="100px" label="作品2" />
          </div>
        </div>

        {/* ===== VERTICAL TEXT ===== */}
        <div className="vertical-section reveal">
          <p className="vertical-text">あなたのファンは、まだあなたを知らないだけ。</p>
        </div>

        {/* ===== MESSAGE CARDS - SCATTERED ===== */}
        <div className="messages-scattered">
          <div className="msg msg-1 reveal">
            <span className="msg-tag">依頼</span>
            <p>「一目惚れしました」</p>
            <span className="msg-price">¥8,000</span>
          </div>
          <div className="msg msg-2 reveal">
            <span className="msg-tag">依頼</span>
            <p>「ずっと憧れてました」</p>
            <span className="msg-price">¥25,000</span>
          </div>
          <div className="msg msg-3 reveal">
            <span className="msg-tag">依頼</span>
            <p>「あなたにお願いしたい」</p>
            <span className="msg-price">¥15,000</span>
          </div>
        </div>

        {/* ===== LARGE NUMBER ===== */}
        <div className="big-num reveal">
          <span className="num">3</span>
          <span className="num-label">ステップで、届く。</span>
        </div>

        {/* ===== STEPS - HORIZONTAL ===== */}
        <div className="steps-flow">
          <div className="step-item reveal">
            <span className="step-n">01</span>
            <span className="step-t">並べる</span>
          </div>
          <div className="step-item reveal">
            <span className="step-n">02</span>
            <span className="step-t">シェア</span>
          </div>
          <div className="step-item reveal">
            <span className="step-n">03</span>
            <span className="step-t">届く</span>
          </div>
        </div>

        {/* ===== PORTFOLIO - TILTED STACK ===== */}
        <div className="portfolio-stack">
          <div className="pf-label reveal">YOUR PAGE</div>
          <div className="pf-cards">
            <div className="pf-card pf-1 reveal">
              <Img w="100%" h="280px" label="ポートフォリオ&#10;画面1" />
            </div>
            <div className="pf-card pf-2 reveal">
              <Img w="100%" h="280px" label="ポートフォリオ&#10;画面2" />
            </div>
          </div>
        </div>

        {/* ===== CTA 1 ===== */}
        <div className="cta-section reveal">
          <button className="cta-btn">
            無料ではじめる
            <span className="cta-arrow">→</span>
          </button>
          <p className="cta-note">0円。ずっと。</p>
        </div>

        {/* ===== TRUST - SIMPLE ===== */}
        <div className="trust reveal">
          <div className="trust-icon">✓</div>
          <p className="trust-text">届く。<br />ちゃんと届く。</p>
          <span className="trust-sub">お金の心配、いらない。</span>
        </div>

        {/* ===== VOICES - OVERLAP ===== */}
        <div className="voices-section">
          <p className="voices-label reveal">VOICES</p>
          <div className="voice-cards">
            <div className="voice-card vc-1 reveal">
              <Img w="100%" h="90px" label="作品" className="voice-img" />
              <p>"営業なしで依頼きた"</p>
              <span>イラストレーター</span>
            </div>
            <div className="voice-card vc-2 reveal">
              <Img w="100%" h="90px" label="作品" className="voice-img" />
              <p>"未払いの不安ゼロ"</p>
              <span>Live2Dモデラー</span>
            </div>
            <div className="voice-card vc-3 reveal">
              <Img w="100%" h="90px" label="作品" className="voice-img" />
              <p>"料金表あると楽"</p>
              <span>同人作家</span>
            </div>
          </div>
        </div>

        {/* ===== GENRES - FLOWING ===== */}
        <div className="genres reveal">
          <div className="genres-scroll">
            <span>イラスト</span><span>Live2D</span><span>漫画</span><span>キャラデザ</span><span>同人誌</span><span>小説挿絵</span><span>TRPG</span><span>ロゴ</span><span>アイコン</span>
            <span>イラスト</span><span>Live2D</span><span>漫画</span><span>キャラデザ</span><span>同人誌</span>
          </div>
        </div>

        {/* ===== MISSION ===== */}
        <div className="mission">
          <p className="mission-eyebrow reveal">同人ワークスについて</p>
          <h2 className="mission-title reveal">
            創ることに、<br />
            <em>集中できる場所を。</em>
          </h2>
          <p className="mission-body reveal">
            面倒なこと、全部引き受けます。
          </p>
        </div>

        {/* ===== FINAL ===== */}
        <div className="final">
          <p className="final-pre reveal">さあ、</p>
          <h2 className="final-title reveal">はじめよう。</h2>
          <div className="final-cta reveal">
            <button className="cta-btn large">
              無料ではじめる
              <span className="cta-arrow">→</span>
            </button>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="footer">
          <div className="footer-logo">同人ワークス</div>
          <nav>
            <a href="#">利用規約</a>
            <a href="#">プライバシー</a>
            <a href="#">特商法</a>
            <a href="#">お問い合わせ</a>
          </nav>
        </footer>

      </main>

      <aside className="side right"></aside>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');

        * {
          box-sizing: border-box;
        }

        .wrapper {
          display: flex;
          justify-content: center;
          min-height: 100vh;
          background: #c4c7cb;
          font-family: 'Zen Maru Gothic', sans-serif;
          color: #111;
        }

        .side {
          flex: 1;
          display: none;
        }

        @media (min-width: 768px) {
          .side { display: block; }
        }

        .main {
          width: 100%;
          max-width: 480px;
          background: #f8f7f5;
          position: relative;
          overflow: hidden;
        }

        /* ===== PLACEHOLDER ===== */
        .img-placeholder {
          background: linear-gradient(135deg, #d0d3d8 0%, #b8bcc2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6a6e75;
          font-size: 0.7rem;
          text-align: center;
          white-space: pre-line;
          border: 2px dashed #9a9ea5;
        }

        /* ===== REVEAL ===== */
        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: all 1s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ===== HERO ===== */
        .hero {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 32px;
          position: relative;
        }

        .hero-sub {
          font-size: 0.75rem;
          color: #888;
          letter-spacing: 0.15em;
          margin-bottom: 20px;
        }

        .hero-title {
          font-size: 2.6rem;
          font-weight: 900;
          line-height: 1.4;
        }

        .hero-title span {
          display: block;
        }

        .hero-title .em {
          color: transparent;
          background: linear-gradient(90deg, #4a6a8a, #7a9aba);
          -webkit-background-clip: text;
          background-clip: text;
        }

        .scroll-line {
          position: absolute;
          bottom: 32px;
          left: 50%;
          width: 1px;
          height: 80px;
          background: linear-gradient(to bottom, #aaa, transparent);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scaleY(0.6); }
          50% { opacity: 1; transform: translateX(-50%) scaleY(1); }
        }

        /* ===== IMAGE BURST ===== */
        .img-burst {
          position: relative;
          padding: 0 0 60px 0;
          margin-left: -20px;
          margin-right: -20px;
        }

        .burst-main {
          transform: rotate(-2deg);
        }

        .burst-float {
          position: absolute;
          top: -40px;
          right: 20px;
          transform: rotate(6deg);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border-radius: 12px;
          overflow: hidden;
        }

        .burst-float2 {
          position: absolute;
          bottom: 30px;
          left: 30px;
          transform: rotate(-4deg);
          box-shadow: 0 8px 30px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        /* ===== VERTICAL TEXT ===== */
        .vertical-section {
          padding: 100px 0;
          display: flex;
          justify-content: center;
        }

        .vertical-text {
          writing-mode: vertical-rl;
          font-size: 1.1rem;
          letter-spacing: 0.3em;
          line-height: 2.5;
          color: #444;
          font-weight: 500;
        }

        /* ===== MESSAGES SCATTERED ===== */
        .messages-scattered {
          position: relative;
          height: 420px;
          margin: 40px 0 80px;
        }

        .msg {
          position: absolute;
          background: #fff;
          padding: 22px 26px;
          border-radius: 16px;
          box-shadow: 0 6px 30px rgba(0,0,0,0.07);
          max-width: 240px;
        }

        .msg-1 {
          top: 0;
          left: 24px;
          transform: rotate(-3deg);
        }

        .msg-2 {
          top: 120px;
          right: 20px;
          transform: rotate(2deg);
        }

        .msg-3 {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) rotate(-1deg);
        }

        .msg-tag {
          font-size: 0.65rem;
          color: #5a7a95;
          background: rgba(90,122,149,0.1);
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 10px;
        }

        .msg p {
          font-size: 1.05rem;
          margin: 0 0 8px;
          color: #222;
        }

        .msg-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          color: #5a8a6a;
          font-weight: 600;
        }

        /* ===== BIG NUMBER ===== */
        .big-num {
          text-align: center;
          padding: 80px 32px 40px;
        }

        .num {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: 9rem;
          font-weight: 600;
          line-height: 1;
          color: #ddd;
          letter-spacing: -0.05em;
        }

        .num-label {
          display: block;
          font-size: 1.1rem;
          color: #555;
          margin-top: -10px;
        }

        /* ===== STEPS FLOW ===== */
        .steps-flow {
          display: flex;
          justify-content: center;
          gap: 24px;
          padding: 40px 24px 100px;
        }

        .step-item {
          text-align: center;
        }

        .step-n {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem;
          color: #5a7a95;
          font-weight: 600;
        }

        .step-t {
          font-size: 0.85rem;
          color: #666;
        }

        /* ===== PORTFOLIO STACK ===== */
        .portfolio-stack {
          padding: 40px 0 100px;
          position: relative;
        }

        .pf-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.7rem;
          letter-spacing: 0.25em;
          color: #999;
          margin-left: 32px;
          margin-bottom: 24px;
        }

        .pf-cards {
          position: relative;
          height: 340px;
          margin: 0 20px;
        }

        .pf-card {
          position: absolute;
          width: 85%;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .pf-1 {
          top: 0;
          left: 0;
          transform: rotate(-4deg);
          z-index: 1;
        }

        .pf-2 {
          top: 40px;
          right: 0;
          transform: rotate(3deg);
          z-index: 2;
        }

        /* ===== CTA ===== */
        .cta-section {
          text-align: center;
          padding: 60px 32px 100px;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          background: #111;
          color: #fff;
          border: none;
          padding: 22px 44px;
          border-radius: 100px;
          font-size: 1.05rem;
          font-weight: 600;
          font-family: 'Zen Maru Gothic', sans-serif;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cta-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        }

        .cta-btn:hover .cta-arrow {
          transform: translateX(6px);
        }

        .cta-arrow {
          transition: transform 0.4s ease;
          font-size: 1.2rem;
        }

        .cta-btn.large {
          padding: 26px 52px;
          font-size: 1.15rem;
        }

        .cta-note {
          margin-top: 18px;
          font-size: 0.8rem;
          color: #999;
        }

        /* ===== TRUST ===== */
        .trust {
          padding: 80px 40px;
          text-align: center;
          background: #f0efed;
        }

        .trust-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #5a8a6a;
          color: #fff;
          font-size: 1.4rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .trust-text {
          font-size: 1.4rem;
          font-weight: 700;
          line-height: 1.7;
          margin-bottom: 12px;
        }

        .trust-sub {
          font-size: 0.85rem;
          color: #888;
        }

        /* ===== VOICES ===== */
        .voices-section {
          padding: 80px 0;
        }

        .voices-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.7rem;
          letter-spacing: 0.3em;
          color: #999;
          text-align: center;
          margin-bottom: 40px;
        }

        .voice-cards {
          position: relative;
          height: 360px;
          margin: 0 28px;
        }

        .voice-card {
          position: absolute;
          background: #fff;
          padding: 18px;
          border-radius: 14px;
          width: 200px;
          box-shadow: 0 6px 25px rgba(0,0,0,0.06);
        }

        .vc-1 {
          top: 0;
          left: 0;
          transform: rotate(-2deg);
        }

        .vc-2 {
          top: 80px;
          right: 0;
          transform: rotate(3deg);
        }

        .vc-3 {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) rotate(-1deg);
        }

        .voice-img {
          border-radius: 8px;
          margin-bottom: 14px;
        }

        .voice-card p {
          font-size: 0.9rem;
          margin: 0 0 8px;
          color: #333;
        }

        .voice-card span {
          font-size: 0.7rem;
          color: #999;
        }

        /* ===== GENRES ===== */
        .genres {
          padding: 60px 0;
          overflow: hidden;
        }

        .genres-scroll {
          display: flex;
          gap: 20px;
          animation: scroll 20s linear infinite;
          width: max-content;
        }

        .genres-scroll span {
          font-size: 0.9rem;
          color: #888;
          white-space: nowrap;
          padding: 10px 20px;
          border: 1px solid #ddd;
          border-radius: 30px;
        }

        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* ===== MISSION ===== */
        .mission {
          background: #111;
          color: #fff;
          padding: 120px 36px;
          text-align: center;
        }

        .mission-eyebrow {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 32px;
        }

        .mission-title {
          font-size: 1.6rem;
          font-weight: 700;
          line-height: 1.8;
          margin-bottom: 28px;
        }

        .mission-title em {
          font-style: normal;
          color: rgba(255,255,255,0.6);
        }

        .mission-body {
          font-size: 0.95rem;
          color: rgba(255,255,255,0.5);
        }

        /* ===== FINAL ===== */
        .final {
          padding: 140px 32px;
          text-align: center;
          background: linear-gradient(180deg, #f8f7f5 0%, #f0efed 100%);
        }

        .final-pre {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem;
          font-style: italic;
          color: #888;
          margin-bottom: 8px;
        }

        .final-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 48px;
        }

        /* ===== FOOTER ===== */
        .footer {
          padding: 50px 28px;
          text-align: center;
          background: #e5e4e2;
        }

        .footer-logo {
          font-size: 0.9rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 20px;
        }

        .footer nav {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .footer nav a {
          font-size: 0.7rem;
          color: #888;
          text-decoration: none;
        }

        .footer nav a:hover {
          color: #555;
        }
      `}</style>
    </div>
  );
}
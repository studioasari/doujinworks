'use client';

import { useEffect, useRef, useState } from 'react';

export default function LPClient() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouse, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.animate').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const Img = ({ h, label, className = '' }: { h: string; label?: string; className?: string }) => (
    <div className={`img-box ${className}`} style={{ height: h }}>
      <span>{label}</span>
    </div>
  );

  return (
    <div className="wrapper">
      <aside className="side" />

      <main className="main">
        {/* Animated Background */}
        <div className="bg-blur">
          <div 
            className="blob b1" 
            style={{ transform: `translate(${mousePos.x * 0.02}px, ${mousePos.y * 0.02}px)` }}
          />
          <div 
            className="blob b2"
            style={{ transform: `translate(${-mousePos.x * 0.015}px, ${mousePos.y * 0.01}px)` }}
          />
          <div className="blob b3" />
        </div>

        {/* ===== HERO ===== */}
        <section className="hero">
          <div className="hero-bg-text" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
            CREATOR
          </div>
          <div className="hero-content">
            <p className="hero-eyebrow animate">FOR YOU</p>
            <h1 className="hero-title animate">
              <span className="line">待っている人が</span>
              <span className="line">
                <em>いる</em>
                <svg className="underline" viewBox="0 0 200 20" preserveAspectRatio="none">
                  <path d="M0,15 Q50,5 100,15 T200,15" fill="none" stroke="currentColor" strokeWidth="3"/>
                </svg>
              </span>
            </h1>
            <div className="hero-scroll animate">
              <div className="scroll-dot" />
            </div>
          </div>
          <div className="hero-float animate">
            <Img h="160px" label="作品" />
          </div>
        </section>

        {/* ===== VISUAL IMPACT ===== */}
        <section className="visual-impact">
          <div 
            className="vi-image animate"
            style={{ transform: `translateY(${scrollY * -0.1}px)` }}
          >
            <Img h="500px" label="依頼が届いた瞬間&#10;スマホ画面・通知&#10;感動するビジュアル" />
            <div className="vi-overlay" />
          </div>
          <div className="vi-text animate">
            <span>あなたの作品を</span>
          </div>
        </section>

        {/* ===== QUOTE ===== */}
        <section className="quote">
          <p className="quote-text animate">
            ポートフォリオを作って、
            <br />
            <span className="highlight">
              待つだけ。
              <svg className="highlight-circle" viewBox="0 0 200 80">
                <ellipse cx="100" cy="40" rx="95" ry="35" fill="none" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
          </p>
        </section>

        {/* ===== MESSAGES ===== */}
        <section className="messages">
          <div className="msg-bg-num">依頼</div>
          <div className="msg-stack">
            <div className="msg m1 animate">
              <div className="msg-glow" />
              <p>「一目惚れしました」</p>
              <span className="msg-price">¥8,000</span>
            </div>
            <div className="msg m2 animate">
              <div className="msg-glow" />
              <p>「ずっと憧れてました」</p>
              <span className="msg-price">¥25,000</span>
            </div>
            <div className="msg m3 animate">
              <div className="msg-glow" />
              <p>「あなたにお願いしたい」</p>
              <span className="msg-price">¥15,000</span>
            </div>
          </div>
        </section>

        {/* ===== BIG STATEMENT ===== */}
        <section className="statement">
          <p className="statement-pre animate">あなたのファンは</p>
          <h2 className="statement-main animate">
            <span className="outline-text">まだ知らない</span>
            <span className="solid-text">だけ。</span>
          </h2>
        </section>

        {/* ===== STEPS ===== */}
        <section className="steps">
          <div className="step-item animate">
            <span className="step-num">01</span>
            <div className="step-content">
              <p className="step-title">並べる</p>
              <p className="step-desc">あなたの作品を</p>
            </div>
          </div>
          <div className="step-line animate" />
          <div className="step-item animate">
            <span className="step-num">02</span>
            <div className="step-content">
              <p className="step-title">シェア</p>
              <p className="step-desc">SNSでURLを</p>
            </div>
          </div>
          <div className="step-line animate" />
          <div className="step-item animate">
            <span className="step-num">03</span>
            <div className="step-content">
              <p className="step-title">届く</p>
              <p className="step-desc">依頼が、あなたに</p>
            </div>
          </div>
        </section>

        {/* ===== PORTFOLIO ===== */}
        <section className="portfolio">
          <div className="pf-label animate">YOUR PAGE</div>
          <div className="pf-visual">
            <div className="pf-card pf-1 animate">
              <Img h="320px" label="ポートフォリオ画面" />
            </div>
            <div className="pf-card pf-2 animate">
              <Img h="280px" label="料金表・依頼ボタン" />
            </div>
            <div className="pf-accent animate" />
          </div>
        </section>

        {/* ===== CTA 1 ===== */}
        <section className="cta animate">
          <button className="cta-btn">
            <span className="cta-text">無料ではじめる</span>
            <span className="cta-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </button>
          <p className="cta-note">0円、ずっと</p>
        </section>

        {/* ===== TRUST ===== */}
        <section className="trust">
          <div className="trust-card animate">
            <div className="trust-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 className="trust-title">届く。ちゃんと届く。</h3>
            <p className="trust-desc">お金の心配、いらない。</p>
          </div>
        </section>

        {/* ===== VOICES ===== */}
        <section className="voices">
          <p className="voices-label animate">VOICES</p>
          <div className="voices-grid">
            <div className="voice-card animate">
              <Img h="100px" label="作品" className="voice-img" />
              <p className="voice-quote">"営業なしで依頼きた"</p>
              <span className="voice-author">イラストレーター</span>
            </div>
            <div className="voice-card animate">
              <Img h="100px" label="作品" className="voice-img" />
              <p className="voice-quote">"料金表あると話早い"</p>
              <span className="voice-author">Live2Dモデラー</span>
            </div>
            <div className="voice-card animate">
              <Img h="100px" label="作品" className="voice-img" />
              <p className="voice-quote">"お金届く安心感"</p>
              <span className="voice-author">同人作家</span>
            </div>
          </div>
        </section>

        {/* ===== GENRES ===== */}
        <section className="genres">
          <div className="genres-track">
            <div className="genres-slide">
              {['イラスト', 'Live2D', '漫画', 'キャラデザ', '同人誌', '小説挿絵', 'TRPG', 'ロゴ', 'アイコン', 'イラスト', 'Live2D', '漫画', 'キャラデザ'].map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== MISSION ===== */}
        <section className="mission">
          <div className="mission-bg">ABOUT</div>
          <div className="mission-content">
            <p className="mission-eyebrow animate">同人ワークスについて</p>
            <h2 className="mission-title animate">
              創ることに、
              <br />
              <em>集中できる場所を。</em>
            </h2>
            <p className="mission-body animate">
              面倒なこと、<br />全部引き受けます。
            </p>
          </div>
        </section>

        {/* ===== FINAL ===== */}
        <section className="final">
          <div className="final-deco" />
          <p className="final-pre animate">さあ、</p>
          <h2 className="final-title animate">はじめよう。</h2>
          <div className="final-cta animate">
            <button className="cta-btn large">
              <span className="cta-text">無料ではじめる</span>
              <span className="cta-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </button>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="footer">
          <div className="footer-logo">同人ワークス</div>
          <nav className="footer-nav">
            <a href="#">利用規約</a>
            <a href="#">プライバシー</a>
            <a href="#">特商法</a>
            <a href="#">お問い合わせ</a>
          </nav>
        </footer>
      </main>

      <aside className="side" />

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap');

        * { box-sizing: border-box; }

        .wrapper {
          display: flex;
          justify-content: center;
          min-height: 100vh;
          background: #bfc3c8;
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
          background: #faf9f7;
          position: relative;
          overflow: hidden;
        }

        /* ===== BG BLUR ===== */
        .bg-blur {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 480px;
          height: 100vh;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s ease-in-out infinite;
        }

        .b1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #a8c0d8 0%, #d8c8b8 100%);
          top: 10%;
          right: -50px;
        }

        .b2 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #c8d8c8 0%, #d8d0c8 100%);
          top: 50%;
          left: -80px;
          animation-delay: -5s;
        }

        .b3 {
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #d0c8d8 0%, #c8d8e0 100%);
          bottom: 20%;
          right: -40px;
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        /* ===== IMAGE BOX ===== */
        .img-box {
          width: 100%;
          background: linear-gradient(145deg, #ccd0d5 0%, #b5bac0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6a6e75;
          font-size: 0.7rem;
          text-align: center;
          white-space: pre-line;
          border: 2px dashed #9a9ea5;
          border-radius: inherit;
        }

        /* ===== ANIMATE ===== */
        .animate {
          opacity: 0;
          transform: translateY(50px);
          transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        /* ===== HERO ===== */
        .hero {
          min-height: 100svh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 32px;
        }

        .hero-bg-text {
          position: absolute;
          top: 15%;
          left: -20px;
          font-size: 5rem;
          font-weight: 900;
          color: transparent;
          -webkit-text-stroke: 1px rgba(0,0,0,0.06);
          letter-spacing: -0.03em;
          pointer-events: none;
          z-index: 0;
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .hero-eyebrow {
          font-size: 0.7rem;
          letter-spacing: 0.4em;
          color: #999;
          margin-bottom: 20px;
        }

        .hero-title {
          font-size: 2.4rem;
          font-weight: 900;
          line-height: 1.5;
        }

        .hero-title .line {
          display: block;
        }

        .hero-title em {
          font-style: normal;
          position: relative;
          display: inline-block;
          background: linear-gradient(135deg, #5a7a95, #7a9ab5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .underline {
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 100%;
          height: 20px;
          color: #5a7a95;
          opacity: 0.4;
        }

        .hero-scroll {
          margin-top: 60px;
          display: flex;
          justify-content: center;
        }

        .scroll-dot {
          width: 8px;
          height: 8px;
          background: #bbb;
          border-radius: 50%;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(20px); opacity: 1; }
        }

        .hero-float {
          position: absolute;
          bottom: 80px;
          right: -30px;
          width: 140px;
          transform: rotate(6deg);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        }

        /* ===== VISUAL IMPACT ===== */
        .visual-impact {
          position: relative;
          margin: 0 -24px;
        }

        .vi-image {
          position: relative;
        }

        .vi-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 50%, #faf9f7 100%);
        }

        .vi-text {
          position: absolute;
          bottom: 80px;
          left: 32px;
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 20px rgba(0,0,0,0.3);
        }

        /* ===== QUOTE ===== */
        .quote {
          padding: 100px 36px;
          text-align: center;
        }

        .quote-text {
          font-size: 1.3rem;
          line-height: 2.2;
          font-weight: 500;
          color: #444;
        }

        .highlight {
          position: relative;
          display: inline-block;
          font-weight: 700;
          color: #2a2a2a;
        }

        .highlight-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 80px;
          color: #5a7a95;
          opacity: 0.3;
          pointer-events: none;
        }

        /* ===== MESSAGES ===== */
        .messages {
          position: relative;
          min-height: 520px;
          padding: 60px 24px;
        }

        .msg-bg-num {
          position: absolute;
          top: 20px;
          right: 20px;
          font-size: 6rem;
          font-weight: 900;
          color: transparent;
          -webkit-text-stroke: 1px rgba(0,0,0,0.04);
          pointer-events: none;
        }

        .msg-stack {
          position: relative;
          height: 400px;
        }

        .msg {
          position: absolute;
          background: #fff;
          padding: 28px 30px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.06);
          max-width: 260px;
          overflow: hidden;
        }

        .msg-glow {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(90,122,149,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .m1 {
          top: 0;
          left: 16px;
          transform: rotate(-2deg);
        }

        .m2 {
          top: 140px;
          right: 16px;
          transform: rotate(3deg);
        }

        .m3 {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) rotate(-1deg);
        }

        .msg p {
          font-size: 1.1rem;
          margin: 0 0 10px;
          color: #222;
          position: relative;
        }

        .msg-price {
          font-size: 1.1rem;
          color: #5a8a6a;
          font-weight: 700;
        }

        /* ===== STATEMENT ===== */
        .statement {
          padding: 120px 32px;
          text-align: center;
        }

        .statement-pre {
          font-size: 1rem;
          color: #888;
          margin-bottom: 16px;
        }

        .statement-main {
          font-size: 2rem;
          line-height: 1.6;
        }

        .outline-text {
          display: block;
          font-weight: 900;
          color: transparent;
          -webkit-text-stroke: 1.5px #333;
        }

        .solid-text {
          display: block;
          font-weight: 900;
          color: #111;
        }

        /* ===== STEPS ===== */
        .steps {
          padding: 80px 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 24px;
        }

        .step-num {
          font-size: 2.5rem;
          font-weight: 300;
          color: #ccc;
          line-height: 1;
        }

        .step-content {
          padding-top: 8px;
        }

        .step-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .step-desc {
          font-size: 0.85rem;
          color: #888;
        }

        .step-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, #ddd, transparent);
          margin-left: 28px;
        }

        /* ===== PORTFOLIO ===== */
        .portfolio {
          padding: 80px 0 120px;
          position: relative;
        }

        .pf-label {
          font-size: 0.65rem;
          letter-spacing: 0.3em;
          color: #aaa;
          margin-left: 32px;
          margin-bottom: 32px;
        }

        .pf-visual {
          position: relative;
          height: 420px;
          margin: 0 20px;
        }

        .pf-card {
          position: absolute;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12);
        }

        .pf-1 {
          width: 85%;
          top: 0;
          left: 0;
          transform: rotate(-3deg);
          z-index: 1;
        }

        .pf-2 {
          width: 75%;
          top: 100px;
          right: 0;
          transform: rotate(4deg);
          z-index: 2;
        }

        .pf-accent {
          position: absolute;
          bottom: -20px;
          left: 40px;
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, rgba(90,122,149,0.2), transparent);
          border-radius: 50%;
          filter: blur(30px);
        }

        /* ===== CTA ===== */
        .cta {
          padding: 60px 32px 100px;
          text-align: center;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          background: #111;
          color: #fff;
          border: none;
          padding: 24px 48px;
          border-radius: 100px;
          font-size: 1.1rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cta-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.6s ease;
        }

        .cta-btn:hover::before {
          left: 100%;
        }

        .cta-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }

        .cta-btn:hover .cta-icon svg {
          transform: translateX(6px);
        }

        .cta-icon svg {
          width: 20px;
          height: 20px;
          transition: transform 0.4s ease;
        }

        .cta-btn.large {
          padding: 28px 56px;
          font-size: 1.2rem;
        }

        .cta-note {
          margin-top: 20px;
          font-size: 0.8rem;
          color: #aaa;
        }

        /* ===== TRUST ===== */
        .trust {
          padding: 60px 28px;
        }

        .trust-card {
          background: linear-gradient(145deg, #f8f8f6, #f0f0ee);
          padding: 48px 36px;
          border-radius: 28px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .trust-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(90,138,106,0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        .trust-check {
          width: 64px;
          height: 64px;
          background: #5a8a6a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .trust-check svg {
          width: 28px;
          height: 28px;
          color: #fff;
        }

        .trust-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .trust-desc {
          font-size: 0.95rem;
          color: #777;
        }

        /* ===== VOICES ===== */
        .voices {
          padding: 80px 28px;
        }

        .voices-label {
          font-size: 0.65rem;
          letter-spacing: 0.35em;
          color: #aaa;
          text-align: center;
          margin-bottom: 40px;
        }

        .voices-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .voice-card {
          background: #fff;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 6px 30px rgba(0,0,0,0.04);
        }

        .voice-img {
          border-radius: 12px;
          margin-bottom: 18px;
          overflow: hidden;
        }

        .voice-quote {
          font-size: 1rem;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .voice-author {
          font-size: 0.75rem;
          color: #999;
        }

        /* ===== GENRES ===== */
        .genres {
          padding: 50px 0;
          overflow: hidden;
        }

        .genres-track {
          overflow: hidden;
        }

        .genres-slide {
          display: flex;
          gap: 16px;
          animation: slideGenres 25s linear infinite;
          width: max-content;
        }

        .genres-slide span {
          padding: 12px 24px;
          font-size: 0.85rem;
          color: #777;
          border: 1px solid #ddd;
          border-radius: 40px;
          white-space: nowrap;
          transition: all 0.3s ease;
        }

        @keyframes slideGenres {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* ===== MISSION ===== */
        .mission {
          background: #111;
          color: #fff;
          padding: 140px 36px;
          position: relative;
          overflow: hidden;
        }

        .mission-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 8rem;
          font-weight: 900;
          color: rgba(255,255,255,0.03);
          pointer-events: none;
        }

        .mission-content {
          position: relative;
          text-align: center;
        }

        .mission-eyebrow {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.35);
          margin-bottom: 32px;
        }

        .mission-title {
          font-size: 1.7rem;
          font-weight: 700;
          line-height: 1.7;
          margin-bottom: 28px;
        }

        .mission-title em {
          font-style: normal;
          color: rgba(255,255,255,0.5);
        }

        .mission-body {
          font-size: 0.95rem;
          color: rgba(255,255,255,0.45);
          line-height: 2;
        }

        /* ===== FINAL ===== */
        .final {
          padding: 160px 32px;
          text-align: center;
          position: relative;
          background: linear-gradient(180deg, #faf9f7 0%, #f5f4f2 100%);
        }

        .final-deco {
          position: absolute;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 80px;
          background: linear-gradient(to bottom, #ddd, transparent);
        }

        .final-pre {
          font-size: 1.2rem;
          font-style: italic;
          color: #999;
          margin-bottom: 8px;
        }

        .final-title {
          font-size: 3.2rem;
          font-weight: 900;
          margin-bottom: 56px;
          letter-spacing: -0.02em;
        }

        /* ===== FOOTER ===== */
        .footer {
          padding: 56px 28px;
          text-align: center;
          background: #e8e7e5;
        }

        .footer-logo {
          font-size: 0.9rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 24px;
        }

        .footer-nav {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 28px;
        }

        .footer-nav a {
          font-size: 0.7rem;
          color: #888;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer-nav a:hover {
          color: #555;
        }
      `}</style>
    </div>
  );
}
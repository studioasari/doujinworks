'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'

export default function CookiePolicyClient() {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <div className="container-narrow" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
          <h1 className="section-title" style={{ marginBottom: 'var(--space-12)' }}>外部送信ポリシー</h1>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            
            <div style={{ marginBottom: '32px', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
              <p style={{ margin: 0, lineHeight: '1.7' }}>
                合同会社スタジオアサリ（以下「当社」といいます）は、電気通信事業法第27条の12の規定に基づき、当社が運営する「同人ワークス」において、Cookieその他の技術を利用してお客様の端末から外部へ送信される情報について、以下のとおり公表いたします。
              </p>
            </div>

            {/* セクションスタイル */}
            <style dangerouslySetInnerHTML={{__html: `
              .transmission-section {
                margin-bottom: 40px;
              }
              .service-name {
                display: inline-block;
                font-weight: 700;
                color: var(--text-primary);
                font-size: 18px;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid var(--text-secondary);
              }
              .info-table {
                width: 100%;
                margin-top: 16px;
                border-collapse: collapse;
              }
              .info-table th {
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                border: 1px solid var(--border-default);
                width: 25%;
                vertical-align: top;
                color: var(--text-primary);
              }
              .info-table td {
                padding: 12px 16px;
                border: 1px solid var(--border-default);
                vertical-align: top;
                line-height: 1.7;
              }
              .info-list {
                margin: 8px 0 8px 20px;
                padding: 0;
              }
              .info-list li {
                margin-bottom: 6px;
              }
              .optout-link {
                color: var(--accent-primary);
                text-decoration: underline;
                word-break: break-all;
              }
              .optout-link:hover {
                text-decoration: none;
              }
              .note-section {
                background-color: var(--bg-elevated);
                padding: 16px;
                margin: 24px 0;
                border-radius: 4px;
                font-size: 13px;
              }
            `}} />

            {/* 前文 */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>1. 外部送信について</h2>
              <p style={{ marginBottom: '12px' }}>
                当社は、本サービスの提供、改善、および利用者の利便性向上のため、以下の外部事業者が提供するツール・サービスを利用しています。
              </p>
              <p>
                これらのツール・サービスの利用に伴い、お客様の端末から外部サーバーへ情報が送信されます。送信される情報の内容、送信先、利用目的、および無効化（オプトアウト）の方法は以下のとおりです。
              </p>
            </div>

            {/* Google Analytics */}
            <div className="transmission-section">
              <div className="service-name">Google Analytics</div>
              
              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Google LLC（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Google Analytics</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>閲覧したページのURL</li>
                        <li>閲覧したページのタイトル</li>
                        <li>当社ウェブサイトを閲覧した日時</li>
                        <li>当社ウェブサイトを閲覧した際のIPアドレス</li>
                        <li>当社ウェブサイトを閲覧した際のインターネット端末及びインターネットブラウザの種類</li>
                        <li>Cookie、広告ID等の利用者を識別する情報</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>本サービスの利用状況の分析</li>
                        <li>本サービスの品質向上、改善</li>
                        <li>アクセス解析レポートの作成</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://policies.google.com/privacy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      <p style={{ marginBottom: '8px' }}>以下のGoogleアナリティクス オプトアウト アドオンをインストールすることで、Google Analyticsによる情報収集を無効化できます。</p>
                      <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://tools.google.com/dlpage/gaoptout
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Google Tag Manager */}
            <div className="transmission-section">
              <div className="service-name">Google Tag Manager</div>
              
              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Google LLC（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Google Tag Manager</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>閲覧したページのURL</li>
                        <li>閲覧したページのタイトル</li>
                        <li>当社ウェブサイトを閲覧した日時</li>
                        <li>当社ウェブサイトを閲覧した際のIPアドレス</li>
                        <li>当社ウェブサイトを閲覧した際のインターネット端末及びインターネットブラウザの種類</li>
                        <li>Cookie等の利用者を識別する情報</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>各種タグの一元管理</li>
                        <li>本サービスの利用状況の分析</li>
                        <li>本サービスの品質向上、改善</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://policies.google.com/privacy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      ブラウザのCookie設定から無効化できます。ただし、無効化すると本サービスの一部機能が利用できなくなる場合があります。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vercel (ホスティング) */}
            <div className="transmission-section">
              <div className="service-name">Vercel（ホスティング）</div>

              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Vercel Inc.（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Vercel</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>本サービスへのアクセス時のすべてのリクエスト情報</li>
                        <li>IPアドレス</li>
                        <li>ブラウザ、デバイス情報</li>
                        <li>Cookie等の識別情報</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>本サービスのホスティング</li>
                        <li>Webサイトの配信</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://vercel.com/legal/privacy-policy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      本サービスの基盤のため、無効化することはできません。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vercel Analytics */}
            <div className="transmission-section">
              <div className="service-name">Vercel Analytics</div>
              
              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Vercel Inc.（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Vercel Analytics</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>閲覧したページのURL</li>
                        <li>リファラー情報</li>
                        <li>当社ウェブサイトを閲覧した日時</li>
                        <li>ブラウザの種類</li>
                        <li>デバイスの種類</li>
                        <li>国・地域情報</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>本サービスのパフォーマンス監視</li>
                        <li>本サービスの利用状況の分析</li>
                        <li>本サービスの品質向上、改善</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://vercel.com/legal/privacy-policy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      ブラウザのCookie設定から無効化できます。ただし、無効化すると本サービスの一部機能が利用できなくなる場合があります。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Supabase */}
            <div className="transmission-section">
              <div className="service-name">Supabase（データベース・認証）</div>

              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Supabase, Inc.（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Supabase</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>氏名、ニックネーム、ペンネーム</li>
                        <li>メールアドレス</li>
                        <li>プロフィール情報</li>
                        <li>認証トークン</li>
                        <li>本サービス上での取引履歴、メッセージ内容</li>
                        <li>IPアドレス、デバイス情報</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>会員登録、認証</li>
                        <li>データの保管・管理</li>
                        <li>本サービスの提供、運営</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://supabase.com/privacy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      本サービスの基盤システムのため、無効化することはできません。本サービスを利用しない場合は、Supabaseへの情報送信は行われません。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cloudflare R2 */}
            <div className="transmission-section">
              <div className="service-name">Cloudflare R2（ストレージ）</div>

              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Cloudflare, Inc.（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Cloudflare R2</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>アップロードされた画像、動画、成果物ファイル等</li>
                        <li>ファイルのメタデータ</li>
                        <li>IPアドレス</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>成果物・添付ファイルの保管</li>
                        <li>ファイル配信</li>
                        <li>本サービスの提供、運営</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://www.cloudflare.com/privacypolicy/
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      ファイルの保管に必須のため、無効化することはできません。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Upstash */}
            <div className="transmission-section">
              <div className="service-name">Upstash（キャッシュ・レート制限）</div>

              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Upstash, Inc.（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Upstash Redis</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>IPアドレス</li>
                        <li>セッション情報</li>
                        <li>一時的なキャッシュデータ</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>レート制限の管理</li>
                        <li>セッション管理</li>
                        <li>本サービスのパフォーマンス向上</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://upstash.com/trust/privacy.pdf" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://upstash.com/trust/privacy.pdf
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      本サービスの基盤システムのため、無効化することはできません。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Resend */}
            <div className="transmission-section">
              <div className="service-name">Resend（メール配信）</div>

              <table className="info-table">
                <tbody>
                  <tr>
                    <th>提供事業者</th>
                    <td>Resend, Inc.（アメリカ合衆国）</td>
                  </tr>
                  <tr>
                    <th>サービス名</th>
                    <td>Resend</td>
                  </tr>
                  <tr>
                    <th>送信される情報</th>
                    <td>
                      <ul className="info-list">
                        <li>メールアドレス</li>
                        <li>氏名、ニックネーム</li>
                        <li>メール本文に含まれる情報</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>利用目的</th>
                    <td>
                      <ul className="info-list">
                        <li>認証メール、取引通知メール等の配信</li>
                        <li>お客様へのサービス案内メールの配信</li>
                        <li>メール配信状況の管理</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <th>プライバシーポリシー</th>
                    <td>
                      <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="optout-link">
                        https://resend.com/legal/privacy-policy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>オプトアウト<br />（無効化）</th>
                    <td>
                      サービス提供に必須のメール（認証メール、取引通知等）は配信停止できません。プロモーションメールについては、メール内の配信停止リンクから配信停止できます。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cookieについて */}
            <div style={{ marginTop: '48px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>2. Cookieについて</h2>
              
              <div className="note-section">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Cookieとは</h3>
                <p style={{ marginBottom: '12px' }}>
                  Cookie（クッキー）とは、ウェブサイトを訪問した際に、ブラウザとサーバーとの間で送受信され、お客様のコンピュータやスマートフォン等の端末に保存される小さなテキストファイルのことです。
                </p>
                <p>
                  Cookieには、ウェブサイトの訪問履歴や入力内容等の情報が記録されます。
                </p>
              </div>

              <div className="note-section">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Cookieの種類</h3>
                
                <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '8px' }}>■ ファーストパーティCookie</p>
                <p style={{ marginBottom: '12px', marginLeft: '16px' }}>
                  当社ウェブサイトのドメインから発行されるCookieです。主にログイン状態の維持や、お客様の設定情報の保存に使用します。
                </p>

                <p style={{ fontWeight: '600', marginBottom: '8px' }}>■ サードパーティCookie</p>
                <p style={{ marginLeft: '16px' }}>
                  当社以外の第三者が発行するCookieです。主にアクセス解析や広告配信の最適化に使用します。
                </p>
              </div>

              <div className="note-section">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Cookieの無効化方法</h3>
                <p style={{ marginBottom: '12px' }}>
                  お客様は、ブラウザの設定により、Cookieの受け入れを拒否したり、Cookieを削除したりすることができます。
                </p>
                
                <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '8px' }}>主要ブラウザの設定方法:</p>
                <ul className="info-list">
                  <li>
                    <strong>Google Chrome:</strong>{' '}
                    <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="optout-link">
                      https://support.google.com/chrome/answer/95647
                    </a>
                  </li>
                  <li>
                    <strong>Safari:</strong>{' '}
                    <a href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="optout-link">
                      https://support.apple.com/ja-jp/guide/safari/sfri11471/mac
                    </a>
                  </li>
                  <li>
                    <strong>Microsoft Edge:</strong>{' '}
                    <a href="https://support.microsoft.com/ja-jp/microsoft-edge/microsoft-edge-の閲覧データとプライバシー" target="_blank" rel="noopener noreferrer" className="optout-link">
                      Microsoft Edge のヘルプページ
                    </a>
                  </li>
                  <li>
                    <strong>Firefox:</strong>{' '}
                    <a href="https://support.mozilla.org/ja/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="optout-link">
                      https://support.mozilla.org/ja/kb/enhanced-tracking-protection-firefox-desktop
                    </a>
                  </li>
                </ul>

                <p style={{ marginTop: '16px', fontSize: '13px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: 'var(--text-secondary)' }}></i>
                  <strong>注意:</strong> Cookieを無効化すると、本サービスの一部機能（ログイン状態の維持等）が正常に動作しなくなる場合があります。
                </p>
              </div>
            </div>

            {/* その他の情報 */}
            <div style={{ marginTop: '48px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>3. その他</h2>
              
              <div className="note-section">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>外部送信ポリシーの変更</h3>
                <p>
                  当社は、利用するツール・サービスの変更等に伴い、本ポリシーを変更することがあります。変更後のポリシーは、本サービス上に掲示した時点より効力を生じるものとします。
                </p>
              </div>

              <div className="note-section">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>お問い合わせ</h3>
                <p style={{ marginBottom: '12px' }}>
                  外部送信に関するお問い合わせは、以下の窓口までお願いいたします。
                </p>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>合同会社スタジオアサリ</p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    所在地: 〒450-0002<br />
                    <span style={{ marginLeft: '48px' }}>愛知県名古屋市中村区名駅3丁目4-10 アルティメイト名駅1st 2階</span>
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>メール: info@studioasari.co.jp</p>
                  <p style={{ margin: 0 }}>電話: 080-6349-9669</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>受付時間: 平日 10:00～18:00（土日祝日を除く）</p>
                </div>
              </div>
            </div>

            {/* 附則 */}
            <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '2px solid var(--border-default)', textAlign: 'right' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--text-primary)' }}>附則</p>
              <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>2025年12月8日 制定・施行</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>2026年4月23日 改定</p>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
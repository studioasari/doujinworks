'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px', maxWidth: '900px' }}>
          <h1 className="section-title mb-32">プライバシーポリシー</h1>

          <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#4A4A4A' }}>
            
            <div style={{ marginBottom: '32px', padding: '20px', backgroundColor: '#F5F5F5', borderLeft: '4px solid #4A4A4A' }}>
              <p style={{ margin: 0, lineHeight: '1.8' }}>
                合同会社スタジオアサリ（以下「当社」といいます）は、お客様（利用者、クリエイター、及び本サービスの閲覧者を総称します）の個人情報を適切に保護することが社会的責務として重要であると考え、本プライバシーポリシーに基づき、個人情報の保護に関する法律その他の法令を遵守して、お客様の個人情報を取得、利用、管理いたします。
              </p>
            </div>

            {/* セクションスタイル */}
            <style dangerouslySetInnerHTML={{__html: `
              .privacy-section {
                margin-bottom: 40px;
                padding-bottom: 32px;
                border-bottom: 1px solid #E0E0E0;
              }
              .privacy-section:last-child {
                border-bottom: none;
              }
              .section-number {
                display: inline-block;
                font-weight: 700;
                color: #1A1A1A;
                font-size: 18px;
                margin-bottom: 16px;
              }
              .subsection-title {
                font-weight: 600;
                color: #1A1A1A;
                margin: 20px 0 12px 0;
                font-size: 15px;
              }
              .item-list {
                margin: 12px 0 12px 24px;
              }
              .item-list li {
                margin-bottom: 8px;
                line-height: 1.8;
              }
              .note-box {
                background-color: #F9F9F9;
                padding: 16px;
                margin: 16px 0;
                border-radius: 4px;
                font-size: 13px;
              }
            `}} />

            {/* 第1条 定義 */}
            <div className="privacy-section">
              <div className="section-number">第1条（定義）</div>
              <p>本プライバシーポリシーにおいて使用する用語の定義は、以下のとおりとします。</p>
              
              <ul className="item-list">
                <li><strong>「本サービス」:</strong> 当社が運営する「同人ワークス」という名称のマッチングプラットフォームサービス</li>
                <li><strong>「利用者」:</strong> 本サービスを利用して仕事を依頼する個人または法人</li>
                <li><strong>「クリエイター」:</strong> 本サービスを利用して仕事を受注する個人または法人</li>
                <li><strong>「お客様」:</strong> 利用者、クリエイター及び本サービスの閲覧者の総称</li>
                <li><strong>「個人情報」:</strong> 個人情報の保護に関する法律第2条第1項に定める個人情報</li>
              </ul>
            </div>

            {/* 第2条 取得する個人情報 */}
            <div className="privacy-section">
              <div className="section-number">第2条（取得する個人情報）</div>
              <p>当社は、本サービスの提供にあたり、以下の個人情報を取得します。</p>

              <div className="subsection-title">（1）お客様が提供する情報</div>
              <ul className="item-list">
                <li>氏名、ニックネーム、ペンネーム</li>
                <li>メールアドレス</li>
                <li>電話番号</li>
                <li>住所</li>
                <li>生年月日、年齢、性別</li>
                <li>プロフィール情報（自己紹介文、スキル、経歴、ポートフォリオ等）</li>
                <li>本人確認書類の記載事項（運転免許証、マイナンバーカード等）</li>
                <li>銀行口座情報（口座名義、口座番号、金融機関名等）</li>
                <li>クレジットカード情報（カード番号、有効期限、セキュリティコード等）</li>
                <li>本サービス上での取引履歴、メッセージ内容</li>
                <li>アップロードされたファイル、画像、動画等のコンテンツ</li>
                <li>お問い合わせ内容</li>
              </ul>

              <div className="subsection-title">（2）自動的に取得する情報</div>
              <ul className="item-list">
                <li>IPアドレス</li>
                <li>ブラウザの種類・バージョン、OS情報</li>
                <li>アクセス日時、閲覧ページ、リファラ情報</li>
                <li>Cookie情報</li>
                <li>デバイス情報（端末の種類、OS、言語設定、タイムゾーン等）</li>
                <li>位置情報（お客様の許可がある場合）</li>
                <li>本サービスの利用履歴、閲覧履歴</li>
              </ul>

              <div className="subsection-title">（3）第三者から取得する情報</div>
              <ul className="item-list">
                <li>決済代行会社から取得する決済関連情報</li>
                <li>本人確認サービス提供会社から取得する本人確認結果情報</li>
                <li>SNS連携により取得する公開プロフィール情報（お客様の許可がある場合）</li>
              </ul>
            </div>

            {/* 第3条 個人情報の利用目的 */}
            <div className="privacy-section">
              <div className="section-number">第3条（個人情報の利用目的）</div>
              <p>当社は、取得した個人情報を以下の目的で利用します。</p>

              <ul className="item-list">
                <li>本サービスの提供、運営、維持、改善のため</li>
                <li>会員登録、本人確認、認証のため</li>
                <li>利用者とクリエイター間の取引の成立、履行、管理のため</li>
                <li>決済処理、請求、支払い業務のため</li>
                <li>お客様からのお問い合わせ対応のため</li>
                <li>利用規約違反行為への対応、不正利用の防止・調査のため</li>
                <li>本サービスの利用状況の分析、統計データの作成のため</li>
                <li>本サービスの品質向上、新機能・新サービスの開発のため</li>
                <li>お客様へのサービス案内、キャンペーン情報の配信のため（お客様が希望される場合）</li>
                <li>アンケート調査の実施のため</li>
                <li>本サービスに関する重要なお知らせの通知のため</li>
                <li>紛争、訴訟への対応のため</li>
                <li>法令に基づく対応のため</li>
                <li>その他、上記利用目的に付随する目的のため</li>
              </ul>

              <div className="note-box">
                <strong>※ 利用目的の変更について</strong><br />
                当社は、上記の利用目的を変更する場合には、変更後の利用目的を本サービス上で公表するものとします。
              </div>
            </div>

            {/* 第4条 個人情報の第三者提供 */}
            <div className="privacy-section">
              <div className="section-number">第4条（個人情報の第三者提供）</div>
              <p>当社は、以下の場合を除き、お客様の同意なく個人情報を第三者に提供いたしません。</p>

              <div className="subsection-title">（1）お客様の同意がある場合</div>
              <p style={{ marginLeft: '24px' }}>
                本サービスの取引において、利用者とクリエイター間で必要な情報（氏名、連絡先等）を相互に開示することについて、お客様が同意している場合
              </p>

              <div className="subsection-title">（2）法令に基づく場合</div>
              <ul className="item-list">
                <li>法令に基づく開示請求があった場合</li>
                <li>裁判所、警察、税務署等の公的機関から法的義務に基づく開示要請があった場合</li>
              </ul>

              <div className="subsection-title">（3）人の生命、身体又は財産の保護のために必要がある場合</div>
              <p style={{ marginLeft: '24px' }}>
                お客様又は第三者の生命、身体又は財産を保護するために必要であって、お客様の同意を得ることが困難である場合
              </p>

              <div className="subsection-title">（4）業務委託先への提供</div>
              <p style={{ marginLeft: '24px' }}>
                以下の業務を委託する場合に、必要な範囲で個人情報を提供することがあります。
              </p>
              <ul className="item-list">
                <li>決済代行会社（Stripe等）への決済業務の委託</li>
                <li>本人確認サービス提供会社への本人確認業務の委託</li>
                <li>メール配信サービス提供会社へのメール配信業務の委託</li>
                <li>カスタマーサポート業務の委託</li>
                <li>システム開発・保守業務の委託</li>
              </ul>
              <div className="note-box">
                ※ 業務委託先との間で適切な秘密保持契約を締結し、個人情報の適切な管理・監督を行います。
              </div>

              <div className="subsection-title">（5）事業承継の場合</div>
              <p style={{ marginLeft: '24px' }}>
                合併、会社分割、事業譲渡その他の事由による事業の承継に伴って個人情報を提供する場合
              </p>
            </div>

            {/* 第5条 外部送信 */}
            <div className="privacy-section">
              <div className="section-number">第5条（外部送信）</div>
              <p>
                当社は、本サービスの利便性向上、利用状況の分析等のため、お客様の端末から外部サーバーへ情報を送信するツール・サービスを利用しています。
              </p>
              <p style={{ marginTop: '12px' }}>
                外部送信される情報の詳細、送信先、利用目的、オプトアウト方法等については、<a href="/cookie_policy" style={{ color: '#0066CC', textDecoration: 'underline' }}>外部送信ポリシー</a>をご確認ください。
              </p>
            </div>

            {/* 第6条 個人情報の安全管理 */}
            <div className="privacy-section">
              <div className="section-number">第6条（個人情報の安全管理）</div>
              <p>当社は、個人情報の漏洩、滅失、毀損等を防止するため、以下の安全管理措置を講じます。</p>

              <div className="subsection-title">（1）組織的安全管理措置</div>
              <ul className="item-list">
                <li>個人情報保護責任者の設置</li>
                <li>個人情報の取扱いに関する規程の策定</li>
                <li>定期的な従業員教育の実施</li>
                <li>内部監査の実施</li>
              </ul>

              <div className="subsection-title">（2）人的安全管理措置</div>
              <ul className="item-list">
                <li>従業員との秘密保持契約の締結</li>
                <li>個人情報の取扱いに関する教育・研修の実施</li>
              </ul>

              <div className="subsection-title">（3）物理的安全管理措置</div>
              <ul className="item-list">
                <li>個人情報を取り扱う区域への入退室管理</li>
                <li>個人情報を含む書類・媒体の施錠管理</li>
              </ul>

              <div className="subsection-title">（4）技術的安全管理措置</div>
              <ul className="item-list">
                <li>アクセス制御による個人情報への不正アクセス防止</li>
                <li>ファイアウォールの設置</li>
                <li>通信の暗号化（SSL/TLS）</li>
                <li>ウイルス対策ソフトウェアの導入</li>
                <li>定期的なセキュリティ診断の実施</li>
              </ul>
            </div>

            {/* 第7条 個人情報の保有期間 */}
            <div className="privacy-section">
              <div className="section-number">第7条（個人情報の保有期間）</div>
              <p>
                当社は、個人情報を利用目的の達成に必要な期間に限り保有します。ただし、法令により保存が義務付けられている場合は、当該期間保有します。
              </p>
              
              <ul className="item-list">
                <li><strong>会員情報:</strong> 退会後5年間</li>
                <li><strong>取引履歴:</strong> 取引完了後7年間（税法上の保存義務）</li>
                <li><strong>本人確認書類:</strong> 本人確認完了後3年間</li>
                <li><strong>決済情報:</strong> 決済完了後5年間</li>
                <li><strong>お問い合わせ内容:</strong> 対応完了後2年間</li>
              </ul>
            </div>

            {/* 第8条 個人情報の開示・訂正・削除 */}
            <div className="privacy-section">
              <div className="section-number">第8条（個人情報の開示・訂正・削除）</div>
              
              <div className="subsection-title">（1）開示・訂正・削除の請求</div>
              <p>
                お客様は、当社が保有するお客様の個人情報について、以下の請求を行うことができます。
              </p>
              <ul className="item-list">
                <li>利用目的の通知</li>
                <li>個人情報の開示</li>
                <li>個人情報の訂正、追加、削除</li>
                <li>個人情報の利用停止、消去</li>
                <li>第三者提供の停止</li>
              </ul>

              <div className="subsection-title">（2）請求方法</div>
              <p>
                個人情報の開示等を請求される場合は、以下のお問い合わせ先までご連絡ください。本人確認の後、合理的な期間内に対応いたします。
              </p>

              <div className="note-box">
                <strong>お問い合わせ先:</strong> info@studioasari.co.jp<br />
                <strong>※</strong> 開示請求には、本人確認書類の提出が必要となる場合があります。<br />
                <strong>※</strong> 開示請求には、手数料（1,000円）をご負担いただく場合があります。
              </div>
            </div>

            {/* 第9条 お問い合わせ窓口 */}
            <div className="privacy-section">
              <div className="section-number">第9条（お問い合わせ窓口）</div>
              <p>
                個人情報の取扱いに関するお問い合わせは、以下の窓口までお願いいたします。
              </p>

              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#F9F9F9', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 12px 0', fontWeight: '600' }}>個人情報保護管理者</p>
                <p style={{ margin: '0 0 8px 0' }}>合同会社スタジオアサリ</p>
                <p style={{ margin: '0 0 8px 0' }}>代表社員: 高橋良輔</p>
                <p style={{ margin: '0 0 8px 0' }}>
                  所在地: 〒450-0002<br />
                  <span style={{ marginLeft: '48px' }}>愛知県名古屋市中村区名駅3丁目4-10 アルティメイト名駅1st 2階</span>
                </p>
                <p style={{ margin: '0 0 8px 0' }}>メール: info@studioasari.co.jp</p>
                <p style={{ margin: 0 }}>電話: 080-6349-9669</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>受付時間: 平日 10:00～18:00（土日祝日を除く）</p>
              </div>
            </div>

            {/* 第10条 プライバシーポリシーの変更 */}
            <div className="privacy-section">
              <div className="section-number">第10条（プライバシーポリシーの変更）</div>
              <p>
                当社は、法令の改正、本サービスの変更等に伴い、本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本サービス上に掲示した時点より効力を生じるものとします。重要な変更の場合は、本サービス上での告知またはメールにてお知らせいたします。
              </p>
            </div>

            {/* 第11条 適用法令・管轄裁判所 */}
            <div className="privacy-section">
              <div className="section-number">第11条（適用法令・管轄裁判所）</div>
              <p style={{ marginBottom: '12px' }}>
                本プライバシーポリシーは、日本法に準拠するものとし、日本法に従って解釈されるものとします。
              </p>
              <p>
                本プライバシーポリシーに起因又は関連する一切の紛争については、名古屋地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </div>

            {/* 附則 */}
            <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '2px solid #E0E0E0', textAlign: 'right' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1A1A1A' }}>附則</p>
              <p style={{ margin: 0, color: '#666' }}>2024年12月8日 制定・施行</p>
            </div>

            {/* 改訂履歴 */}
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#F9F9F9', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600', fontSize: '14px', color: '#1A1A1A' }}>改訂履歴</p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
                <li>2024年12月8日 - 制定・施行</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
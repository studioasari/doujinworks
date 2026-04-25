'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'

export default function LawClient() {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <div className="container-narrow" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
          <h1 className="section-title" style={{ marginBottom: 'var(--space-12)' }}>特定商取引法に基づく表記</h1>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            
            {/* テーブルスタイル */}
            <style dangerouslySetInnerHTML={{__html: `
              .law-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
              }
              .law-table th {
                padding: 16px;
                text-align: left;
                font-weight: 600;
                border: 1px solid var(--border-default);
                width: 30%;
                vertical-align: top;
              }
              .law-table td {
                padding: 16px;
                border: 1px solid var(--border-default);
                vertical-align: top;
              }
              .law-table tr:hover {
                background-color: var(--bg-hover);
              }
              .note {
                color: var(--text-tertiary);
                font-size: 12px;
                margin-top: 8px;
              }
              .subsection {
                margin-left: 20px;
                margin-top: 12px;
              }
              .subsection-title {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 8px;
              }
            `}} />

            <table className="law-table">
              <tbody>
                <tr>
                  <th>販売業者</th>
                  <td>合同会社スタジオアサリ</td>
                </tr>

                <tr>
                  <th>運営責任者</th>
                  <td>高橋良輔（代表社員）</td>
                </tr>

                <tr>
                  <th>所在地</th>
                  <td>
                    〒450-0002<br />
                    愛知県名古屋市中村区名駅3丁目4-10 アルティメイト名駅1st 2階
                  </td>
                </tr>

                <tr>
                  <th>お問い合わせ</th>
                  <td>
                    <strong>メールアドレス:</strong> info@studioasari.co.jp<br />
                    <strong>電話番号:</strong> 080-6349-9669<br />
                    <div className="note">
                      ※営業時間: 平日 10:00～18:00（土日祝日を除く）<br />
                      ※お取引やサービスについてのお問い合わせは、個人情報保護および円滑なご案内のため、メールにてご連絡いただけますと幸いです。
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>サービス内容</th>
                  <td>
                    依頼者とクリエイターをつなぐ取引の場の提供および、クリエイターに代わり依頼者から代金を受領する収納代行機能の提供
                    <div className="note">
                      ※本サービスは、依頼者とクリエイター間の取引の場を提供するものであり、当社は取引（業務委託契約）の当事者とはなりません。<br />
                      ※当社は、クリエイターから代理受領権限の付与を受け、依頼者からクリエイターへの代金を代理で受領します（収納代行）。
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>販売価格</th>
                  <td>
                    <div className="subsection">
                      <div className="subsection-title">■ 依頼者の支払金額</div>
                      <p>依頼ごとに依頼者とクリエイター間で合意された金額</p>
                      <div className="note">
                        ※すべて消費税込みの価格です
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ クリエイターの手数料</div>
                      <p style={{ marginBottom: '8px' }}>
                        <strong>1. 利用手数料（サービス手数料）:</strong> 報酬額の12%（クリエイター負担）
                      </p>
                      <p>
                        <strong>2. 振込手数料:</strong> 330円（クリエイター負担）
                      </p>
                      <div className="note">
                        ※クリエイターの実受取額 = 報酬額 × 88% - 330円
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ 手数料計算例（報酬額10,000円の場合）</div>
                      <p style={{ marginLeft: '20px', fontSize: '13px' }}>
                        依頼者支払額: 10,000円<br />
                        利用手数料（12%）: -1,200円<br />
                        振込手数料: -330円<br />
                        <strong>クリエイター実受取額: 8,470円</strong>
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>支払方法</th>
                  <td>
                    <div className="subsection">
                      <div className="subsection-title">■ 依頼者の支払方法</div>
                      <p>クレジットカード決済、コンビニ決済、銀行振込、QRコード決済等</p>
                      <p style={{ marginLeft: '20px', fontSize: '13px', marginTop: '8px' }}>
                        対応カードブランド: VISA、Mastercard、American Express、JCB、Diners Club、Discover
                      </p>
                      <div className="note">
                        ※決済は、当社が契約する決済代行サービスを通じて行われます<br />
                        ※ご利用可能な決済手段は、決済代行サービスの仕様により変更される場合があります
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ クリエイターへの支払方法</div>
                      <p>銀行振込</p>
                      <p style={{ marginLeft: '20px', fontSize: '13px', marginTop: '8px' }}>
                        締日: 毎月末日<br />
                        支払日: 翌月20日（土日祝日の場合は翌営業日）<br />
                        最低振込額: 1,000円
                      </p>
                      <div className="note">
                        ※1,000円未満の場合は翌月に繰り越されます<br />
                        ※振込先口座の登録が必要です<br />
                        ※報酬確定から180日が経過しても出金されない場合、登録された振込先口座へ強制的に振り込まれます（振込手数料は残高から控除）。振込先口座が未登録又は不備がある場合は供託されます（利用規約第11条）<br />
                        ※退会時の残高の取扱いについては、利用規約第21条をご確認ください
                      </div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>支払時期</th>
                  <td>
                    <div className="subsection">
                      <div className="subsection-title">■ 依頼者</div>
                      <p>契約成立後、依頼者の決済手続きにより速やかに決済を実行</p>
                      <div className="note">
                        ※契約成立後、依頼者は決済代行サービスを通じて報酬額の支払いを行います。当社はクリエイターに代わって代金を受領します（収納代行）<br />
                        ※決済完了後、クリエイターは作業を開始します<br />
                        ※クリエイターへは、業務委託契約の履行後、当社から代金の精算が行われます
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ クリエイター</div>
                      <p>月末締め、翌月20日に登録された銀行口座へ振込</p>
                      <div className="note">
                        例: 12月1日～12月31日に完了した取引 → 翌年1月20日に振込<br />
                        ※振込日が土日祝日の場合は翌営業日に順延されます
                      </div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>サービス提供時期</th>
                  <td>
                    依頼者とクリエイター間で合意された納期に、本サービス上で納品されます。
                    <div className="note">
                      ※具体的な納期は各取引により異なります
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>返品・キャンセルについて</th>
                  <td>
                    <div className="subsection">
                      <div className="subsection-title">■ 依頼者側のキャンセル</div>
                      <p style={{ marginBottom: '8px' }}>
                        <strong>・契約成立前:</strong> 自由にキャンセル可能（請求は発生しません）
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        <strong>・契約成立後、決済前:</strong> 依頼者は決済を行わずキャンセル可能（請求は発生しません）
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        <strong>・決済後、作業開始前:</strong> 依頼者とクリエイターの協議により決定（成立時は返金処理）
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        <strong>・作業開始後:</strong> 原則としてキャンセル不可
                      </p>
                      <div className="note">
                        但し、以下の場合はキャンセル可能:<br />
                        ① クリエイターが納期を7日以上遅延し、依頼者の催告後7日以内に納品しない場合<br />
                        ② クリエイターが連絡不能となり、依頼者の連絡後7日以上応答がない場合<br />
                        ③ その他当社が特別に認めた場合
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ 納品物の検収</div>
                      <p>
                        依頼者は納品物を確認し、問題がある場合は修正を依頼することができます。
                      </p>
                      <div className="note">
                        ※修正依頼の回数は原則として3回までとします<br />
                        ※当事者間で別途合意がある場合はその限りではありません
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ 返金について</div>
                      <p>
                        キャンセルが認められた場合、返金額は以下のとおりとします。なお、当社はクリエイターの代理として、決済代行会社を通じて返金処理（Refund）を代行します。
                      </p>
                      <p style={{ marginLeft: '20px', fontSize: '13px', marginTop: '8px' }}>
                        ・クリエイター都合: 決済代金の全額を依頼者に返金<br />
                        ・依頼者都合: 作業進捗に応じた金額を協議により決定し、残額を依頼者に返金<br />
                        ・当事者間の認識に争いがあると当社が認めた場合: 決済代金の全額を依頼者に返金<br />
                        ・その他: 当社が状況を判断し適切な処理を決定
                      </p>
                      <div className="note">
                        ※返金にかかる決済手数料は、キャンセルの原因を作った側の負担とします
                      </div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>不良品の取扱い</th>
                  <td>
                    納品物が契約内容と著しく異なる場合、依頼者は修正を依頼するか、取引のキャンセルを申し出ることができます。当事者間で解決できない場合は、運営者が仲裁を行います。
                  </td>
                </tr>

                <tr>
                  <th>引渡し時期</th>
                  <td>
                    依頼者とクリエイター間で合意された納期に、本サービス上で納品されます。
                  </td>
                </tr>

                <tr>
                  <th>動作環境</th>
                  <td>
                    <strong>推奨ブラウザ:</strong>
                    <p style={{ marginLeft: '20px', marginTop: '8px', fontSize: '13px' }}>
                      • Google Chrome（最新版）<br />
                      • Safari（最新版）<br />
                      • Microsoft Edge（最新版）<br />
                      • Firefox（最新版）
                    </p>
                    <div className="note">
                      ※上記以外のブラウザでは正常に動作しない場合があります<br />
                      ※スマートフォン・タブレットでもご利用いただけます
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>販売価格以外に<br />必要な料金</th>
                  <td>
                    インターネット接続に必要な通信回線等の諸費用
                    <div className="note">
                      ※通信料金はお客様のご契約内容により異なります
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>その他</th>
                  <td>
                    <div className="subsection">
                      <div className="subsection-title">■ 知的財産権について</div>
                      <p>
                        成果物に関する著作権その他の知的財産権は、取引において別途合意がない限り、作成したクリエイターに帰属します。
                      </p>
                      <div className="note">
                        ※権利譲渡については、依頼者とクリエイター間で個別に合意することができます
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ 税務処理について</div>
                      <p>
                        利用者は、自己の責任において税務処理を行うものとします。
                      </p>
                      <div className="note">
                        ※当社は源泉徴収義務を負いません<br />
                        ※確定申告が必要な方は、適切に申告を行ってください
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ 適格請求書（インボイス）について</div>
                      <p>
                        クリエイターが消費税法上の適格請求書発行事業者として登録されている場合、当社は取引成立後、依頼者に対して適格請求書（インボイス）を発行します。
                      </p>
                      <div className="note">
                        ※クリエイターは適格請求書発行事業者登録をしている場合、登録番号を当社に通知する必要があります（利用規約第6条）<br />
                        ※未登録のクリエイターとの取引については、仕入税額控除の経過措置が適用される場合があります
                      </div>
                    </div>

                    <div className="subsection">
                      <div className="subsection-title">■ トラブル対応について</div>
                      <p>
                        取引に関するトラブルについては、当事者間で解決していただくことを原則としますが、必要に応じて運営者が仲裁を行います。
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <th>適用法令</th>
                  <td>
                    <p style={{ marginBottom: '8px' }}>
                      本表記は、特定商取引に関する法律（昭和51年法律第57号）に基づき作成しています。
                    </p>
                    <p>
                      詳細は<a href="/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>利用規約</a>および<a href="/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>プライバシーポリシー</a>をご確認ください。
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-default)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>【重要】ご利用にあたっての注意事項</h2>
              
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>■ 決済の仕組みについて（収納代行）</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  本サービスでは、依頼者とクリエイター間の業務委託契約に基づく代金の支払を、当社が決済代行サービスを通じて代理で受領する「収納代行」方式を採用しています。具体的には、依頼者とクリエイター間で契約が成立した後、依頼者は決済代行サービスを通じて報酬額の支払いを行います。当社は、クリエイターから付与された代理受領権限に基づき代金を受領し、業務委託契約の履行後、利用手数料および振込手数料を控除した金額をクリエイターへ業務委託報酬として精算します。
                </p>
              </div>

              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>■ 本サービス外での直接取引の禁止</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  本サービスを通じて取引が成立した相手方と、本サービスを介さずに直接業務委託契約を締結することは、利用規約第18条第4号により禁止されています。違反した場合、利用規約第20条に基づき、当社が得られたであろう利用手数料相当額を最低額として、損害賠償を請求する場合があります（利用規約第18条第4号の効力は、本サービス上で当該相手方との取引が成立した日から1年間）。
                </p>
              </div>

              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>■ お支払いの安全性について</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  本サービスの決済は、当社が契約する決済代行サービスを通じて処理されます。クレジットカード情報等の決済情報は当社サーバーには保存されず、決済代行サービスにおいて安全に処理されます。
                </p>
              </div>
            </div>

            <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '2px solid var(--border-default)', textAlign: 'right' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--text-primary)' }}>附則</p>
              <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>2025年12月8日 制定</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>2026年4月23日 改定</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
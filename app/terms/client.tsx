'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'

export default function TermsClient() {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <div className="container-narrow" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="section-title" style={{ marginBottom: 'var(--space-12)' }}>利用規約</h1>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
              最終更新日: 2026年4月23日
            </p>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第1章 総則</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第1条（適用）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 本利用規約（以下「本規約」といいます）は、合同会社スタジオアサリ（以下「当社」といいます）が提供する「同人ワークス」（以下「本サービス」といいます）の利用条件を、本サービスを利用するすべてのユーザー（以下「利用者」といいます）と当社との間で定めるものです。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 利用者は、本規約に同意した上で本サービスを利用するものとします。本サービスを利用した時点で、本規約に同意したものとみなします。
              </p>
              <p>
                3. 本サービスに関して当社が別途定める各種ガイドライン、ポリシー、お知らせ等は本規約の一部を構成するものとし、本規約と矛盾する場合を除き、これらも遵守するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第2条（定義）</h3>
              <p style={{ marginBottom: '12px' }}>
                本規約において使用する用語の定義は、次の各号に定めるとおりとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 「本サービス」: 当社が運営する「同人ワークス」という名称の、依頼者とクリエイターをつなぐ取引の場および決済代行機能を提供するサービス
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 「依頼者」: 本サービスを通じて制作依頼を投稿する利用者
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 「クリエイター」: 本サービスを通じて制作を受注する利用者
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (4) 「取引」: 依頼者とクリエイター間で成立する制作契約
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (5) 「決済」: 依頼者が当社指定の決済代行サービスを通じて報酬額を支払うこと
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (6) 「報酬」: 取引において依頼者がクリエイターに支払う金額
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (7) 「成果物」: 取引においてクリエイターが依頼者に納品する制作物
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (8) 「利用手数料」: クリエイターが本サービスの利用の対価として当社に支払う、報酬額の12%に相当する手数料
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (9) 「振込手数料」: クリエイターへの振込時に控除される330円の手数料
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (10) 「登録情報」: 利用者が会員登録時に当社に提供した一切の情報
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (11) 「知的財産権」: 著作権、商標権、特許権その他の知的財産に関する権利
                </p>
                <p>
                  (12) 「反社会的勢力」: 暴力団、暴力団員、暴力団準構成員、暴力団関係企業、総会屋、社会運動標榜ゴロ、政治活動標榜ゴロ、特殊知能暴力集団その他これらに準ずる者
                </p>
              </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第3条（規約の変更）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 当社は、以下のいずれかに該当する場合、利用者の個別の同意を得ることなく、本規約を変更できるものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 本規約の変更が、利用者の一般の利益に適合する場合
                </p>
                <p>
                  (2) 本規約の変更が、契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的である場合
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                2. 当社は、本規約の変更を行う場合、変更後の本規約の効力発生日の2週間前までに、本サービス上への掲載又は利用者への電子メール送信その他適切な方法により、利用者に通知するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 変更後の本規約の効力発生日以降に利用者が本サービスを利用した場合、当該利用者は変更後の本規約に同意したものとみなします。
              </p>
              <p>
                4. 本規約の変更により利用者に損害が生じた場合であっても、当社の故意又は重過失による場合を除き、当社は一切の責任を負いません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第2章 会員登録</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第4条（登録）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 本サービスの利用を希望する者（以下「登録希望者」といいます）は、本規約を遵守することに同意し、当社の定める情報を当社の定める方法で提供することにより、会員登録を申請するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 登録の申請は、本サービスを利用する個人又は法人自身が行うものとし、真実、正確かつ最新の情報を当社に提供するものとします。代理人による登録は認められません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 会員として登録できる者の資格は以下のとおりとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 満18歳以上であること（法人の場合は適用されません）
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 電子メールアドレスを保有していること
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 既に本サービスの会員となっていないこと
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (4) 本規約の全ての条項に同意すること
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (5) 過去5年以内に反社会的勢力に所属せず、これらの者との関係を有していないこと
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (6) 日本国内において適法に就労するための要件を満たしていること
                </p>
                <p>
                  (7) 過去に本サービスの利用停止処分又は登録抹消処分を受けたことがないこと
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                4. 当社は、登録希望者が以下のいずれかに該当する場合、会員登録を承諾しないことができるものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 本規約に違反するおそれがあると当社が判断した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 虚偽の情報を提供した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 前項各号に定める資格要件を満たさない場合
                </p>
                <p>
                  (4) その他当社が会員登録を適当でないと判断した場合
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                5. 当社は、会員登録を承諾しない場合、その理由を開示する義務を負いません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                6. 利用者は、複数のアカウントを保有することができないものとします。当社が特別に承認した場合に限り、この限りではありません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                7. 当社は、利用者の本人確認、資格等の確認のため、当社所定の本人確認書類の提出を求めることができるものとします。利用者がこれに応じない場合、当社は本サービスの利用を制限し、又は会員登録を停止若しくは抹消できるものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                8. 利用者が、未成年者であるにもかかわらず、成年者である旨又は法定代理人の同意を得た旨の虚偽の情報を登録して本サービスを利用した場合、民法第21条に定める「制限行為能力者が行為能力者であることを信じさせるために用いた詐術」に該当するものとし、当該利用者は本サービスにおける法律行為を取り消すことはできないものとします。
              </p>
              <p>
                9. 利用者が前項以外の虚偽の情報を登録した場合、当社は第21条に定める利用停止又は登録抹消の措置を講じることができるものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第5条（登録情報の変更）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、登録情報に変更があった場合、遅滞なく、当社所定の方法により変更手続を行うものとします。
              </p>
              <p>
                2. 登録情報の変更を怠ったことにより利用者に生じた損害について、当社の故意又は重過失による場合を除き、当社は一切の責任を負いません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第6条（適格請求書発行事業者登録）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者が消費税法上の適格請求書発行事業者の登録を受けている場合、又は新たに登録を受けた場合、当社に対し、遅滞なく当該登録番号その他当社が定める事項を通知するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 利用者が適格請求書発行事業者登録を取り消され、又はその登録の効力を失ったときは、直ちに当社に対してその旨通知するものとします。
              </p>
              <p>
                3. 利用者が本条に定める情報提供義務を怠ったこと、又は虚偽の情報を提供したことにより、利用者、他の利用者又は当社に損害が生じた場合、当該利用者は当該損害を賠償する責任を負うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第3章 取引</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第7条（取引の成立）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 依頼者は、本サービスを通じて制作依頼を投稿できます。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. クリエイターは、依頼に対して応募できます。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 依頼者がクリエイターを採用し、金額と納期を確定した時点で取引が成立するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 取引成立後、依頼者は当社指定の決済代行サービスを通じて速やかに報酬額の決済を行うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 本サービスは、依頼者とクリエイターの取引の場および決済代行機能を提供するものであり、当社は依頼者とクリエイターが締結する業務委託契約の当事者とはなりません。成果物の品質、納期、契約不履行その他取引に関する一切の責任は、依頼者とクリエイターが負うものとし、当社はこれを負いません。
              </p>
              <p>
                6. 依頼者とクリエイターの間に生じた紛争は、原則として当事者間で解決するものとします。当社は任意で仲裁を行うことがありますが、これを行う義務を負うものではありません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第8条（決済と収納代行）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 依頼者は、取引成立後、当社が指定する決済代行サービスを通じて報酬額の決済を行うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 本サービスにおいて、クリエイターと当社との間には代理受領契約が成立するものとし、クリエイターは、当社に対し、依頼者に対して有する報酬請求権の代理受領権限を授与するものとします。当社は、本条に基づきクリエイターに代わって依頼者から報酬を受領する収納代行機能を提供します。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 当社が決済代行会社から報酬を受領した時点で、依頼者からクリエイターへの報酬の法的な支払いは完了したものとみなします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. クリエイターは、決済の確認後、作業を開始するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 当社が収納代行として受領した金銭は、当社の預り金ではなく、クリエイターに精算する義務を負う債務として管理するものとし、当社は適切に会計処理を行うものとします。
              </p>
              <p>
                6. 納品物の検収完了後、当社は、収納代行として受領した金額から利用手数料および振込手数料を控除した金額を、本規約に定める支払時期にクリエイターへ精算するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第9条（納品・検収）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. クリエイターは、取引において合意された納期までに、成果物を納品するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 依頼者は、納品後7日以内に成果物を検収し、承認又は差戻しの通知を行うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 依頼者が前項の期間内に合理的な理由なく検収結果を通知しない場合、成果物は承認されたものとみなします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 前項により成果物が承認されたものとみなされた場合、依頼者は異議を申し立てることができないものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 当社は、検収期限の3日前に、依頼者に対して検収期限が近づいている旨の通知を送信するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                6. 差戻しの回数は、原則として3回までとします。但し、依頼者とクリエイターの合意により、これを変更することができます。
              </p>
              <p>
                7. 依頼者が差戻しを行う場合、具体的な修正内容を明示するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第10条（取引の中断・解除）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 取引の中断・解除は、以下の場合に限り認められるものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 決済前（クリエイター採用前）: 依頼者は自由にキャンセルできる
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 決済後、作業開始前: 依頼者とクリエイターの双方の合意がある場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 作業開始後: 原則として解除不可。但し、以下の場合を除く
                </p>
                <div style={{ marginLeft: '20px' }}>
                  <p style={{ marginBottom: '4px' }}>
                    ① 依頼者とクリエイターの双方の合意がある場合
                  </p>
                  <p style={{ marginBottom: '4px' }}>
                    ② いずれかの当事者が義務を履行せず、相手方が7日以上の期間を定めて催告したにもかかわらず、当該期間内に履行しない場合
                  </p>
                  <p style={{ marginBottom: '4px' }}>
                    ③ いずれかの当事者が7日以上連絡不能となり、相手方からの連絡に応答しない場合
                  </p>
                  <p style={{ marginBottom: '4px' }}>
                    ④ クリエイターが納期を7日以上遅延した場合
                  </p>
                  <p>
                    ⑤ その他当社が特別に認めた場合
                  </p>
                </div>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                2. 前項第3号②から④により取引が解除された場合、当社はクリエイターの代理として、決済代行会社を通じて当該取引に係る決済の返金処理（Refund）を代行するものとします。具体的な処理は以下のとおりとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) クリエイターの責めに帰すべき事由による解除: 決済代金の全額を依頼者に返金する
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 依頼者の責めに帰すべき事由による解除: 作業進捗に応じた金額を当事者間で協議の上決定し、残額を依頼者に返金する
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 当事者の提供する情報等に基づき、当社が双方に確認し、債務の履行について当事者間の認識に争いがあると認めた場合: 当社は当該取引の支払事務を終了し、決済代金の全額を依頼者に返金する
                </p>
                <p>
                  (4) その他、当社が取引を継続することが不適当であると判断した場合: 当社が状況を判断し、適切な処理を決定する
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                3. 契約成立後（決済前を含む）、当事者の一方が契約を解除したい場合は、相手方にキャンセル申請を行い、双方の合意が必要となります。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. キャンセル申請を受けた当事者は、申請から7日以内に同意または拒否の意思表示を行うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 前項の期間内に応答がない場合、キャンセル申請に同意したものとみなし、契約は自動的に解除されます。
              </p>
              <p style={{ marginBottom: '12px' }}>
                6. 決済済みの場合、キャンセルが成立した時点で返金処理を行います。ただし、決済手数料は返金されません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                7. 以下の場合は、キャンセル申請が可能です。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 納期から7日以上経過しても納品がない場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 相手方と7日以上連絡が取れない場合
                </p>
                <p>
                  (3) その他、当社が認める正当な理由がある場合
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                8. いずれかの当事者が取引の中断・解除を希望する場合、速やかに相手方及び当社に通知するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                9. 取引の中断・解除に関して当事者間で争いがある場合、当社が状況を確認し、適切な処理を決定できるものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                10. 返金処理にかかる決済手数料は、取引解除の原因を作った側の負担とします。但し、双方の合意による解除の場合は、依頼者の負担とします。
              </p>
              <p>
                11. 本条第1項第3号②から④の催告は、本サービス内のメッセージ機能又は電子メールにより行うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第11条（長期未出金残高の処理）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 以下の各号に該当する場合、当社は登録された振込先口座へ未出金の残高を強制的に振り込むことができるものとし、利用者は当該振込に要する振込手数料を残高から控除されることに、あらかじめ同意するものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 第10条第2項各号に該当すると当社が判断した日から、当該代金が処理されないまま180日が経過した場合
                </p>
                <p>
                  (2) 報酬が確定した日から、クリエイターへの支払いが行われないまま180日が経過した場合
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                2. 前項の規定にかかわらず、利用者が振込先口座を登録していない場合、又は登録された口座情報に不備があり振込が不可能な場合、当社は当該残高を供託することができるものとします。
              </p>
              <p>
                3. 前項の供託は、利用者が第5条に定める登録情報の変更義務を怠ったことにより生じたものであるため、当該供託に要する費用は利用者の負担とします。当社は、供託金から当該費用を控除することができるものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第4章 手数料・支払</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第12条（手数料）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. クリエイターは、取引成立時の報酬額に対し、12%の利用手数料を本サービスの利用の対価として当社に支払うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. クリエイターへの振込時、振込手数料として330円を控除するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 手数料は、予告なく変更される場合があります。変更する場合は、第3条に定める方法により事前に通知します。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 依頼者は、本サービスの利用に関して手数料を負担しないものとします。
              </p>
              <p>
                5. 当社は、クリエイターに報酬を引き渡すにあたり、当該報酬の引渡債務と、クリエイターの当社に対する利用手数料及び振込手数料の支払債務を対当額にて相殺の上、その残額をクリエイターに引き渡すものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第13条（支払）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. クリエイターへの報酬は、月末締め、翌月20日払いとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 最低振込額は1,000円とし、1,000円未満の場合は翌月に繰り越されます。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 振込先口座の登録がない場合、支払いは保留されます。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 振込先口座に誤りがあった場合、組戻し手数料はクリエイターの負担とします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 当社は、クリエイターへの報酬の精算にあたり、利用手数料及び振込手数料を控除した金額を支払うものとします。
              </p>
              <p>
                6. 振込先として指定できる口座は、日本国内の銀行、ゆうちょ銀行、信用金庫、労働金庫、信用農業協同組合連合会、信用漁業協同組合連合会、農業協同組合のいずれかとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第14条（税務処理）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、自己の責任において税務処理を行うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 当社は、源泉徴収義務を負わないものとし、依頼者とクリエイター間において源泉徴収が必要な場合は、両者間で処理するものとします。
              </p>
              <p>
                3. 確定申告が必要な利用者は、自己の責任において適切に申告を行うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第15条（関係法令の遵守）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、本サービスにおける取引において、特定受託事業者に係る取引の適正化等に関する法律（令和5年法律第25号。以下「フリーランス新法」といいます。）、下請代金支払遅延等防止法その他関係法令を遵守するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 本サービスにおける取引において、依頼者は、フリーランス新法その他関係法令に基づき、クリエイターに対し、業務内容・報酬額・納期その他の取引条件を書面又は電磁的記録により明示するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 本サービスにおける取引において、依頼者は、クリエイターから成果物の給付を受けた日から60日以内に報酬を支払うものとします。当社による収納代行及び月次精算は、本項の定める支払期日を遵守するものとします。
              </p>
              <p>
                4. 当社は、前各項の義務の履行について、関与する義務を負わないものとしますが、必要に応じて利用者に対し注意喚起を行うことがあります。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第5章 知的財産権</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第16条（成果物の権利帰属）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 成果物に関する著作権その他の知的財産権は、取引において別途合意がない限り、作成したクリエイターに帰属するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 前項にかかわらず、依頼者とクリエイター間で権利譲渡について別途合意がある場合は、その合意が優先されるものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. クリエイターは、取引において知的財産権を依頼者に譲渡した成果物について、依頼者又は依頼者の取引先に対し、著作者人格権を行使しないものとします。
              </p>
              <p>
                4. クリエイターは、第三者の知的財産権を侵害していない成果物を納品することを保証するものとします。第三者の知的財産権を侵害したことにより依頼者又は当社に損害が生じた場合、クリエイターは当該損害を賠償する責任を負うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第17条（ポートフォリオ掲載）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. クリエイターは、成果物をポートフォリオとして自己のプロフィールページ又は外部のポートフォリオサイトに掲載できるものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 前項にかかわらず、依頼者が秘密保持の必要性から掲載を禁止する場合、クリエイターはこれに従うものとします。
              </p>
              <p>
                3. 当社は、本サービスの広告・宣伝のため、利用者が投稿した依頼内容、成果物等を無償で利用できるものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第6章 禁止事項・運営上の措置</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第18条（禁止事項）</h3>
              <p style={{ marginBottom: '12px' }}>
                利用者は、本サービスの利用にあたり、以下の行為を行ってはならないものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 法令又は公序良俗に違反する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 犯罪行為に関連する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 当社、他の利用者又は第三者の知的財産権、肖像権、プライバシー、名誉その他の権利又は利益を侵害する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (4) 利用者が、本サービスを通じて取引が成立した相手方と、本サービスを介さずに直接業務委託契約（これに類する契約を含み、直接の報酬の授受の有無を問いません）を締結する行為（直接取引の誘引又は応諾を含む）。本号の効力は、本サービス上で当該相手方との取引が成立した日から1年間に限るものとします。但し、当社が事前に書面で承諾した場合はこの限りではありません。
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (5) 虚偽の情報を登録又は提供する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (6) 他の利用者のアカウントを不正に使用する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (7) 複数のアカウントを保有する行為（当社が特別に承認した場合を除く）
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (8) 本サービスのシステムに不正にアクセスする行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (9) コンピューターウイルス等の有害なプログラムを送信又は提供する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (10) 他の利用者を差別、誹謗中傷する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (11) わいせつな情報、青少年に有害な情報を送信又は提供する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (12) 異性交際を目的とする行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (13) 宗教活動又は宗教団体への勧誘行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (14) 政治活動、選挙運動又はこれらに類する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (15) ネットワークビジネス、マルチ商法等への勧誘行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (16) 本サービスと競合するサービスを宣伝する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (17) 著しく低額な報酬で業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (18) 業務内容が不明確な依頼を投稿する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (19) 正当な理由なく、繰り返しキャンセルを行う行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (20) 本サービスの運営を妨害する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (21) 反社会的勢力に利益を提供する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (22) 役務提供又は成果物の納品が実質的に存在しないなど、実態を伴わない取引をする行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (23) 依頼者が偽造クレジットカード又は不正取得されたクレジットカードを用いて決済する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (24) 同一人物又は同一法人が重複して会員登録をし、実質的に同一人物間又は同一法人間で取引する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (25) 本サービスの利用に伴い取得した他の利用者の情報を用いて、第三者に対して、当社を介さずに当該利用者を紹介・取次等を行う行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (26) 報酬確定前に商品・サービス等の購入が必要な業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (27) 委託する業務の内容、手順、納入する成果物の仕様、納期、業務の実施条件、免責条件など、業務の遂行に必要となる定めのない業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (28) ECサービス・口コミサイトのレビューを記載する業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (29) 検索エンジンサービスの検索結果に影響を与えるおそれのある業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (30) アフィリエイト、外部サービスへの登録、メールマガジンへの登録など、本サービスの趣旨とは異なる目的の業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (31) 依頼する業務の性質上必要がないにもかかわらず、勤務時間・勤務地を制限する業務を依頼する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (32) 類似する内容の業務の依頼を同時期に複数回投稿する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (33) 会員資格を停止又は抹消された利用者に代わり、当該利用者が再度会員登録をする行為、又はそれを助長する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (34) 本人の同意を得ることなく、又は詐欺的な手段（いわゆるフィッシング及びこれに類する手段を含む）により、他の利用者の登録情報を取得する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (35) 他者の設備若しくは本サービス用設備に無権限でアクセスし、又はポートスキャン、DoS攻撃若しくは大量のメール送信等により、その利用若しくは運営に支障を与える行為、又は支障を与えるおそれのある行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (36) サーバ等のアクセス制御機能を解除又は回避するための情報、機器、ソフトウェア等を流通させる行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (37) アカウントを第三者に譲渡、貸与、売買、又は売買を試みる行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (38) クリエイターが、依頼者から受託した業務の全部又は一部を、依頼者の事前の承諾なく第三者に再委託（下請け）する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (39) 当社が事前に承諾した場合を除き、本サービス内のメッセージ機能等を用いず、外部の連絡先（LINE、X（旧Twitter）、Discord、メールアドレス、電話番号等）を交換する行為、又は外部のサービスへ誘導する行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (40) 成果物に画像生成AI等の生成AIを利用した場合において、依頼者に対して当該事実を開示せず、又は虚偽の開示を行う行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (41) その他、本サービスの適切な利用に反すると当社が判断する行為
                </p>
                <p>
                  (42) その他当社が不適切と判断する行為
                </p>
              </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第19条（監視業務）</h3>
              <p>
                当社は、利用者が本サービスを適正に利用しているかどうかを監視する業務を当社の裁量により行うものとし、利用者はこれに同意するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第20条（損害賠償の特則）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者が第18条第4号に違反し、本サービスを介さずに直接取引を行った場合、当該直接取引が本サービスを通じて成立していれば当社が得られたであろう利用手数料相当額を、当社が被った損害の最低額として推定するものとします。当該利用者は、当社に対し、当該損害額（より多額の損害が発生したことを当社が立証した場合は当該金額）を賠償するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 前項に加え、当社は、違反行為の継続防止のため、必要な措置を講じることができるものとします。
              </p>
              <p>
                3. 当社は、本条に基づく金銭債権を保全するため、必要な法的措置を講じることができるものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第7章 利用停止・登録抹消</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第21条（利用停止及び登録抹消）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 当社は、利用者が以下のいずれかに該当する場合、事前に通知することなく、当該利用者について本サービスの利用を一時停止し、又は会員登録を抹消できるものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 本規約のいずれかの条項に違反した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 登録情報に虚偽、誤記又は記載漏れがあることが判明した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 第4条第3項に定める資格要件を満たさないことが判明した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (4) 支払停止若しくは支払不能となり、又は破産手続開始、民事再生手続開始、会社更生手続開始若しくは特別清算開始の申立てがあった場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (5) 手形又は小切手が不渡りとなった場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (6) 差押、仮差押、仮処分、強制執行又は競売の申立てがあった場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (7) 租税公課の滞納処分を受けた場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (8) 死亡した場合又は後見開始、保佐開始若しくは補助開始の審判を受けた場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (9) 最後のログインから1年以上経過した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (10) 当社からの連絡に対し、30日以上応答がない場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (11) 反社会的勢力である、又は反社会的勢力と関係を有することが判明した場合
                </p>
                <p>
                  (12) その他当社が本サービスの利用又は会員登録の継続を適当でないと判断した場合
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                2. 前項に基づき当社が利用停止又は登録抹消の措置を講じた場合、当社は、当該利用者が出金できる状態にある金銭及び今後支払われる予定であった金銭について、支払留保その他当社が適切と判断する処置を行うことができるものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 利用者は、当社所定の方法により、会員登録を抹消できるものとします。但し、未完了の取引（応募中、契約成立後、作業中、検収中のものを含む）がある場合、当該取引の完了後でなければ抹消できません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. クリエイターとして未振込の報酬残高がある場合、退会時の取扱いは以下のとおりとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 残高が振込手数料（330円）を超える場合: 利用者は退会前に出金申請を行い、振込完了後に退会手続を行うものとします。
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 残高が振込手数料（330円）以下の場合: 出金に必要な手数料に満たないため出金申請を行うことができません。利用者は、以下のいずれかを選択できるものとします。
                </p>
                <div style={{ marginLeft: '20px' }}>
                  <p style={{ marginBottom: '4px' }}>
                    ① 本サービスを継続利用し、残高が振込手数料を超えるまで待って出金申請を行う
                  </p>
                  <p>
                    ② 当社所定の方法により、残高を放棄する旨を明示的に同意して退会する
                  </p>
                </div>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                5. 前項第2号②の場合、利用者が残高放棄の意思を明示的に表明した時点で、当該残高に対する請求権は消滅するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                6. 会員登録の抹消後も、利用者は、本規約に基づき負担する義務及び債務を免れないものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                7. 当社は、本条に基づき利用停止又は登録抹消を行ったことにより利用者に生じた損害について、当社の責めに帰すべき事由がある場合を除き、一切の責任を負いません。
              </p>
              <p>
                8. 当社は、前項に基づく措置を講じるにあたり、利用者への事前の通知を要しないものとします。当社の故意又は重過失による場合を除き、利用者は、当該措置によって被った一切の損害について、当社に対して賠償請求を行わないものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第8章 反社会的勢力の排除</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第22条（反社会的勢力の排除）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、現在及び将来にわたり、自己が反社会的勢力に該当しないこと、反社会的勢力と関係を有しないことを表明し、保証するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 利用者は、自ら又は第三者を利用して、以下の行為を行わないことを保証するものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 暴力的な要求行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 法的な責任を超えた不当な要求行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 脅迫的な言動又は暴力を用いる行為
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (4) 風説の流布、偽計又は威力を用いて、当社の信用を毀損し、又は業務を妨害する行為
                </p>
                <p>
                  (5) その他前各号に準ずる行為
                </p>
              </div>
              <p style={{ marginTop: '12px' }}>
                3. 当社は、利用者が前2項に違反したと認められる場合、何らの催告なく、直ちに本サービスの利用を停止し、又は会員登録を抹消できるものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第9章 免責・損害賠償</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第23条（免責）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 当社は、利用者間の取引に関して、責任を負いません（但し、当社に故意又は重過失がある場合は、この限りではありません）。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 当社は、本サービスの提供の中断、停止、終了、利用不能又は変更、利用者のメッセージ又はデータの削除又は消失、会員登録の抹消、本サービスの利用によるデータの消失又は機器の故障若しくは損傷、その他本サービスに関連して利用者が被った損害につき、責任を負いません（但し、当社に故意又は重過失がある場合は、この限りではありません）。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 当社は、本サービスに事実上又は法律上の瑕疵がないことを保証するものではありません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 当社は、利用者が本サービスを利用することにより、他の利用者又は第三者に対し損害を与えた場合、当該利用者は自己の費用と責任においてこれを賠償するものとし、当社は責任を負いません（但し、当社に故意又は重過失がある場合は、この限りではありません）。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 利用者は、当社が、経済産業省制定「電子商取引及び情報財取引等に関する準則」で定める「ユーザー間取引プラットフォームのサービス運営事業者」であり、成果物に対して一切の責任を負わないことに同意します。
              </p>
              <p style={{ marginBottom: '12px' }}>
                6. 利用者は、成果物に関する紛争を依頼者とクリエイターの二者間のみで解決することに同意します。
              </p>
              <p style={{ marginBottom: '12px' }}>
                7. 取引終了後2年が経過した取引におけるメッセージ及び納品された成果物については、当社の裁量により削除するものとします。利用者はこれにつきあらかじめ同意するものとし、当該措置により利用者又は第三者が損害を被った場合であっても、当社は責任を負いません（但し、当社に故意又は重過失がある場合は、この限りではありません）。
              </p>
              <p>
                8. 当社は、利用者の登録情報、身元、責任能力、業務遂行能力その他一切の情報の真実性、正確性について、いかなる保証も行うものではありません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第24条（損害賠償）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者が本規約に違反し、当社に損害を与えた場合、当該利用者は、当社に対し、その一切の損害（弁護士費用を含みます）を賠償するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 前項の規定にかかわらず、当社が利用者（消費者契約法上の消費者に限る）に対して債務不履行又は不法行為に基づき損害賠償責任を負う場合（当社に故意又は重過失がある場合を除く）、その賠償額の上限は、以下のいずれか高い方の金額とします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 当該利用者が過去1年間に当社に支払った手数料の総額
                </p>
                <p>
                  (2) 10万円
                </p>
              </div>
              <p>
                3. 前項の規定は、当社に故意又は重過失がある場合には適用されないものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>第10章 その他</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第25条（秘密保持）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、本サービスの利用に関連して知り得た他の利用者の秘密情報を、事前の書面による承諾なく、第三者に開示又は漏洩してはならず、本サービスの利用目的以外で使用してはならないものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 前項に定める秘密情報から、以下の各号に定める情報は除外します。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 開示者から開示を受ける前に、被開示者が正当に保有していたことを証明できる情報
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 開示者から開示を受ける前に、公知となっていた情報
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (3) 開示者から開示を受けた後に、被開示者の責めに帰すべからざる事由により公知となった情報
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (4) 被開示者が、正当な権限を有する第三者から秘密保持義務を負うことなく正当に入手した情報
                </p>
                <p>
                  (5) 被開示者が、開示された情報によらず独自に開発した情報
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                3. 当社は、利用者間における秘密保持について何らこれを保証するものではなく、利用者が本条第1項の規定に違反したことにより他の利用者その他の第三者との間で紛争が生じたとしても、当社の故意又は重過失による場合を除き、当社は一切の責任を負わないものとし、利用者の責任と費用でこれを解決するものとします。
              </p>
              <p>
                4. 本条の規定は、会員登録抹消後も5年間有効に存続するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第26条（個人情報の取扱い）</h3>
              <p>
                当社は、利用者の個人情報を、当社が別途定めるプライバシーポリシーに従い、適切に取り扱うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第27条（通知）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 当社から利用者への通知は、本サービス上への表示、登録された電子メールアドレスへの送信その他当社が適当と認める方法により行うものとします。
              </p>
              <p>
                2. 前項の通知が電子メールで行われる場合、当該電子メールが送信された時点で、利用者に到達したものとみなします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第28条（権利義務の譲渡禁止）</h3>
              <p>
                利用者は、当社の書面による事前の承諾なく、本規約に基づく権利義務の全部又は一部を第三者に譲渡し、又は担保に供してはならないものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第29条（事業譲渡）</h3>
              <p>
                当社は、本サービスの事業を第三者に譲渡した場合、当該事業譲渡に伴い、本サービスの運営者たる地位、本規約上の地位、本規約に基づく権利及び義務並びに利用者の登録情報その他情報を当該事業譲渡の譲受人に譲渡することができるものとし、利用者は、当該譲渡につきあらかじめ同意するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第30条（分離可能性）</h3>
              <p>
                本規約のいずれかの条項又はその一部が、消費者契約法その他の法令により無効又は執行不能と判断された場合であっても、本規約の残りの規定及び一部が無効又は執行不能と判断された規定の残りの部分は、継続して完全に効力を有するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第31条（準拠法及び合意管轄）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 本規約の準拠法は日本法とします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 本サービスに関して紛争が生じた場合、名古屋地方裁判所又は名古屋簡易裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
              <p>
                3. 前項の規定にかかわらず、利用者が消費者契約法上の「消費者」に該当する場合、民事訴訟法の定めに従い、被告の普通裁判籍の所在地を管轄する裁判所、又は当該利用者の住所地を管轄する裁判所を第一審の管轄裁判所とします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第32条（協議解決）</h3>
              <p>
                本規約に定めのない事項又は本規約の解釈に疑義が生じた場合、当社及び利用者は、誠実に協議の上、これを解決するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>第33条（お問い合わせ）</h3>
              <p style={{ marginBottom: '12px' }}>
                本規約に関するお問い合わせは、以下までご連絡ください。
              </p>
              <p style={{ marginLeft: '20px', marginBottom: '8px' }}>
                合同会社スタジオアサリ
              </p>
              <p style={{ marginLeft: '20px', marginBottom: '8px' }}>
                〒450-0002 愛知県名古屋市中村区名駅3丁目4-10 アルティメイト名駅1st 2階
              </p>
              <p style={{ marginLeft: '20px', marginBottom: '8px' }}>
                メールアドレス: info@studioasari.co.jp
              </p>
              <p style={{ marginLeft: '20px' }}>
                電話番号: 080-6349-9669
              </p>
            </section>

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-default)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              <p>2025年12月8日 制定</p>
              <p>2025年12月16日 改定</p>
              <p>2026年4月23日 改定</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
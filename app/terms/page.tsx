'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'

export default function TermsPage() {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px', maxWidth: '800px' }}>
          <h1 className="section-title mb-32">利用規約</h1>

          <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#4A4A4A' }}>
            <p style={{ marginBottom: '24px', color: '#6B6B6B' }}>
              最終更新日: 2024年12月16日
            </p>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第1章 総則</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第1条（適用）</h3>
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第2条（定義）</h3>
              <p style={{ marginBottom: '12px' }}>
                本規約において使用する用語の定義は、次の各号に定めるとおりとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 「本サービス」: 当社が運営する「同人ワークス」という名称のクリエイターマッチングプラットフォームサービス
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
                  (5) 「仮払い」: 取引成立後、依頼者が当社指定の決済サービスを通じて報酬額を事前に支払うこと
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (6) 「報酬」: 取引において依頼者がクリエイターに支払う金額
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (7) 「成果物」: 取引においてクリエイターが依頼者に納品する制作物
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (8) 「プラットフォーム手数料」: クリエイターが当社に支払う、報酬額の12%に相当する手数料
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第3条（規約の変更）</h3>
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
              <p>
                3. 変更後の本規約の効力発生日以降に利用者が本サービスを利用した場合、当該利用者は変更後の本規約に同意したものとみなします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第2章 会員登録</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第4条（登録）</h3>
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
              <p>
                6. 利用者は、複数のアカウントを保有することができないものとします。当社が特別に承認した場合に限り、この限りではありません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第5条（登録情報の変更）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、登録情報に変更があった場合、遅滞なく、当社所定の方法により変更手続を行うものとします。
              </p>
              <p>
                2. 登録情報の変更を怠ったことにより利用者に生じた損害について、当社は一切の責任を負いません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第3章 取引</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第6条（取引の成立）</h3>
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
                4. 取引成立後、依頼者は速やかに仮払いを行うものとします。
              </p>
              <p>
                5. 本サービスは、依頼者とクリエイターの取引の場を提供するものであり、当社は取引の当事者とはなりません。取引に関する一切の責任は、依頼者とクリエイターが負うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第7条（仮払い制度）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 本サービスは、取引の安全性を確保するため、仮払い制度を採用しています。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 依頼者は、取引成立後、当社が指定する決済サービス（Stripe）を通じて報酬額を仮払いするものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. クリエイターは、仮払いの確認後、作業を開始するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 納品物の検収完了後、当社は仮払い金額からプラットフォーム手数料及び振込手数料を差し引いた金額をクリエイターへ支払うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 仮払い金は、取引が完了するまで当社が管理し、依頼者又はクリエイターのいずれにも帰属しないものとします。
              </p>
              <p>
                6. 報酬の支払事務は、当社がクリエイターに代わって依頼者から報酬を受領し、これをクリエイターに引き渡すことにより行われるものとします。クリエイターは当社に対して、依頼者に対する報酬請求権の代理受領権を授与するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第8条（納品・検収）</h3>
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第9条（取引の中断・解除）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 取引の中断・解除は、以下の場合に限り認められるものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 仮払い前: 依頼者は自由にキャンセルできる
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 仮払い後、作業開始前: 依頼者とクリエイターの双方の合意がある場合
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
                2. 前項第3号②から④により取引が解除された場合、当社は以下のとおり処理するものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) クリエイターの責めに帰すべき事由による解除: 仮払金を依頼者に全額返金
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 依頼者の責めに帰すべき事由による解除: 作業進捗に応じた金額を当事者間で協議の上決定し、当社が支払処理を行う
                </p>
                <p>
                  (3) その他の場合: 当社が状況を判断し、適切な処理を決定
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                3. 契約成立後（仮払い前を含む）、当事者の一方が契約を解除したい場合は、相手方にキャンセル申請を行い、双方の合意が必要となります。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. キャンセル申請を受けた当事者は、申請から7日以内に同意または拒否の意思表示を行うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                5. 前項の期間内に応答がない場合、キャンセル申請に同意したものとみなし、契約は自動的に解除されます。
              </p>
              <p style={{ marginBottom: '12px' }}>
                6. 仮払い済みの場合、キャンセルが成立した時点で返金処理を行います。ただし、決済手数料は返金されません。
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第10条（時効）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 以下の各号に該当する場合、仮払金又は確定した報酬について、依頼者又はクリエイターは、当該金員に係る返還請求権、支払請求権その他一切の権利を失い、当該金員は当社に帰属するものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 第9条第2項各号に該当すると当社が判断した日から、仮払金が処理されないまま180日が経過した場合
                </p>
                <p style={{ marginBottom: '8px' }}>
                  (2) 報酬が確定した日から、クリエイターへの支払いが行われないまま180日が経過した場合
                </p>
                <p>
                  (3) 第17条第2項に定める処置が必要と当社が判断した日から、180日経過した場合
                </p>
              </div>
              <p style={{ marginTop: '12px' }}>
                2. 前項の期間内に、当事者から当社に対して何らの連絡もない場合、当該当事者は権利を放棄したものとみなします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第4章 手数料・支払</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第11条（手数料）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. クリエイターは、取引成立時の報酬額に対し、12%のプラットフォーム手数料を当社に支払うものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. クリエイターへの振込時、振込手数料として330円を控除するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 手数料は、予告なく変更される場合があります。変更する場合は、第3条に定める方法により事前に通知します。
              </p>
              <p>
                4. 依頼者は、本サービスの利用に関して手数料を負担しないものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第12条（支払）</h3>
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
                5. 当社は、クリエイターへの報酬の支払いにあたり、プラットフォーム手数料及び振込手数料を控除した金額を支払うものとします。
              </p>
              <p>
                6. 振込先として指定できる口座は、日本国内の銀行、ゆうちょ銀行、信用金庫、労働金庫、信用農業協同組合連合会、信用漁業協同組合連合会、農業協同組合のいずれかとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第13条（税務処理）</h3>
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
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第5章 知的財産権</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第14条（成果物の権利帰属）</h3>
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第15条（ポートフォリオ掲載）</h3>
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
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第6章 禁止事項</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第16条（禁止事項）</h3>
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
                  (4) 本サービスを通じて取引した相手と、本サービスを介さずに直接取引を行う行為（直接取引の誘引又は応諾を含む）
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
                <p>
                  (22) その他当社が不適切と判断する行為
                </p>
              </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第17条（違約金）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者が第16条第4号に違反し、本サービスを介さずに直接取引を行った場合、当該利用者は、当社に対し、違約金として以下のいずれか高い方の金額を支払うものとします。
              </p>
              <div style={{ marginLeft: '20px' }}>
                <p style={{ marginBottom: '8px' }}>
                  (1) 当該取引の報酬額に対するプラットフォーム手数料相当額
                </p>
                <p>
                  (2) 100万円
                </p>
              </div>
              <p style={{ marginBottom: '12px', marginTop: '12px' }}>
                2. 前項の違約金は、損害賠償額の予定ではなく、当社に実際に発生した損害がこれを上回る場合、当社は別途損害賠償を請求できるものとします。
              </p>
              <p>
                3. 当社は、本条に基づく金銭債権を保全するため、必要な法的措置を講じることができるものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第7章 利用停止・登録抹消</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第18条（利用停止及び登録抹消）</h3>
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
                3. 利用者は、当社所定の方法により、いつでも会員登録を抹消できるものとします。但し、未完了の取引がある場合、当該取引の完了後でなければ抹消できません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. 会員登録の抹消後も、利用者は、本規約に基づき負担する義務及び債務を免れないものとします。
              </p>
              <p>
                5. 当社は、本条に基づき利用停止又は登録抹消を行ったことにより利用者に生じた損害について、当社の責めに帰すべき事由がある場合を除き、一切の責任を負いません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第8章 反社会的勢力の排除</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第19条（反社会的勢力の排除）</h3>
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
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第9章 免責・損害賠償</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第20条（免責）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 当社は、利用者間の取引に関して一切の責任を負いません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 当社は、本サービスの提供の中断、停止、終了、利用不能又は変更、利用者のメッセージ又はデータの削除又は消失、会員登録の抹消、本サービスの利用によるデータの消失又は機器の故障若しくは損傷、その他本サービスに関連して利用者が被った損害につき、当社の責めに帰すべき事由がある場合を除き、一切の責任を負いません。
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. 当社は、本サービスに事実上又は法律上の瑕疵がないことを保証するものではありません。
              </p>
              <p>
                4. 当社は、利用者が本サービスを利用することにより、他の利用者又は第三者に対し損害を与えた場合、当該利用者は自己の費用と責任においてこれを賠償するものとし、当社は一切の責任を負いません。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第21条（損害賠償）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者が本規約に違反し、当社に損害を与えた場合、当該利用者は、当社に対し、その一切の損害（弁護士費用を含みます）を賠償するものとします。
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. 当社が利用者に対して損害賠償責任を負う場合、その賠償額の上限は、当該利用者が当社に支払った手数料の総額（但し、上限10万円）とします。
              </p>
              <p>
                3. 前項の規定は、当社に故意又は重過失がある場合には適用されないものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>第10章 その他</h2>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第22条（秘密保持）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 利用者は、本サービスの利用に関連して知り得た他の利用者の秘密情報を、事前の書面による承諾なく、第三者に開示又は漏洩してはならず、本サービスの利用目的以外で使用してはならないものとします。
              </p>
              <p>
                2. 前項の規定は、会員登録抹消後も5年間有効に存続するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第23条（個人情報の取扱い）</h3>
              <p>
                当社は、利用者の個人情報を、当社が別途定めるプライバシーポリシーに従い、適切に取り扱うものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第24条（通知）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 当社から利用者への通知は、本サービス上への表示、登録された電子メールアドレスへの送信その他当社が適当と認める方法により行うものとします。
              </p>
              <p>
                2. 前項の通知が電子メールで行われる場合、当該電子メールが送信された時点で、利用者に到達したものとみなします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第25条（権利義務の譲渡禁止）</h3>
              <p>
                利用者は、当社の書面による事前の承諾なく、本規約に基づく権利義務の全部又は一部を第三者に譲渡し、又は担保に供してはならないものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第26条（分離可能性）</h3>
              <p>
                本規約のいずれかの条項又はその一部が、消費者契約法その他の法令により無効又は執行不能と判断された場合であっても、本規約の残りの規定及び一部が無効又は執行不能と判断された規定の残りの部分は、継続して完全に効力を有するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第27条（準拠法及び合意管轄）</h3>
              <p style={{ marginBottom: '12px' }}>
                1. 本規約の準拠法は日本法とします。
              </p>
              <p>
                2. 本サービスに関して紛争が生じた場合、名古屋地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第28条（協議解決）</h3>
              <p>
                本規約に定めのない事項又は本規約の解釈に疑義が生じた場合、当社及び利用者は、誠実に協議の上、これを解決するものとします。
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>第29条（お問い合わせ）</h3>
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

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #E0E0E0', textAlign: 'center', color: '#999', fontSize: '12px' }}>
              <p>2024年12月8日 制定</p>
              <p>2024年12月16日 改定</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
import PricingList from '@/app/components/PricingList'

export const metadata = {
  title: '小説執筆の依頼・料金表一覧 | 同人ワークス',
  description: '小説家への依頼ならこちら。ライトノベル、シナリオ、SS、二次創作小説など、様々な小説を依頼できます。料金表を比較して最適なクリエイターを見つけましょう。',
}

export default function NovelPricingPage() {
  return (
    <PricingList 
      category="novel"
      pageTitle="小説"
      pageDescription="小説家に依頼する"
    />
  )
}
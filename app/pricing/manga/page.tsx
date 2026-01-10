import PricingList from '@/app/components/PricingList'

export const metadata = {
  title: 'マンガ制作の依頼・料金表一覧 | 同人ワークス',
  description: '漫画家への依頼ならこちら。同人誌、商業漫画、Webtoon、4コマ漫画など、様々な漫画を依頼できます。料金表を比較して最適なクリエイターを見つけましょう。',
}

export default function MangaPricingPage() {
  return (
    <PricingList 
      category="manga"
      pageTitle="マンガ"
      pageDescription="漫画家に依頼する"
    />
  )
}
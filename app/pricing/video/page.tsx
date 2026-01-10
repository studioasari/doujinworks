import PricingList from '@/app/components/PricingList'

export const metadata = {
  title: '動画制作の依頼・料金表一覧 | 同人ワークス',
  description: '動画クリエイターへの依頼ならこちら。MV、PV、アニメーション、動画編集など、様々な動画制作を依頼できます。料金表を比較して最適なクリエイターを見つけましょう。',
}

export default function VideoPricingPage() {
  return (
    <PricingList 
      category="video"
      pageTitle="動画"
      pageDescription="動画クリエイターに依頼する"
    />
  )
}
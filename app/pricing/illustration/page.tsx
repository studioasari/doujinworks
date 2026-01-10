import PricingList from '@/app/components/PricingList'

export const metadata = {
  title: 'イラスト制作の依頼・料金表一覧 | 同人ワークス',
  description: 'イラストレーターへの依頼ならこちら。キャラクターイラスト、アイコン、立ち絵、背景など、様々なイラストを依頼できます。料金表を比較して最適なクリエイターを見つけましょう。',
}

export default function IllustrationPricingPage() {
  return (
    <PricingList 
      category="illustration"
      pageTitle="イラスト"
      pageDescription="イラストレーターに依頼する"
    />
  )
}
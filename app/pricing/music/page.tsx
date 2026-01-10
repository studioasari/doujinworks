import PricingList from '@/app/components/PricingList'

export const metadata = {
  title: '音楽制作の依頼・料金表一覧 | 同人ワークス',
  description: '音楽クリエイターへの依頼ならこちら。BGM、主題歌、効果音、作曲、編曲など、様々な音楽制作を依頼できます。料金表を比較して最適なクリエイターを見つけましょう。',
}

export default function MusicPricingPage() {
  return (
    <PricingList 
      category="music"
      pageTitle="音楽"
      pageDescription="音楽クリエイターに依頼する"
    />
  )
}
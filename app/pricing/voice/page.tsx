import PricingList from '@/app/components/PricingList'

export const metadata = {
  title: 'ボイス収録の依頼・料金表一覧 | 同人ワークス',
  description: '声優・ナレーターへの依頼ならこちら。キャラクターボイス、ナレーション、歌ってみた、ASMRなど、様々なボイス収録を依頼できます。料金表を比較して最適なクリエイターを見つけましょう。',
}

export default function VoicePricingPage() {
  return (
    <PricingList 
      category="voice"
      pageTitle="ボイス"
      pageDescription="声優・ナレーターに依頼する"
    />
  )
}
import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: 'ボイス作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿したボイス作品を閲覧できます。ボイスドラマ、ナレーション、ASMRなど様々なボイス作品をご覧ください。',
}

export default function VoicePortfolioPage() {
  return (
    <PortfolioList 
      category="voice"
      pageTitle="ボイス作品"
      pageDescription="クリエイターのボイス作品を見る"
    />
  )
}
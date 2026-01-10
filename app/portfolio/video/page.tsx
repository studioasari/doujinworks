import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: '動画作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿した動画作品を閲覧できます。MV、アニメーション、PVなど様々な動画作品をご覧ください。',
}

export default function VideoPortfolioPage() {
  return (
    <PortfolioList 
      category="video"
      pageTitle="動画作品"
      pageDescription="クリエイターの動画作品を見る"
    />
  )
}
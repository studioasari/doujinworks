import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: '音楽作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿した音楽作品を閲覧できます。BGM、オリジナル曲、アレンジなど様々な音楽作品をご覧ください。',
}

export default function MusicPortfolioPage() {
  return (
    <PortfolioList 
      category="music"
      pageTitle="音楽作品"
      pageDescription="クリエイターの音楽作品を見る"
    />
  )
}
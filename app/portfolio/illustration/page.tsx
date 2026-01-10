import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: 'イラスト作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿したイラスト作品を閲覧できます。キャラクターイラスト、背景、アイコンなど様々なイラスト作品をご覧ください。',
}

export default function IllustrationPortfolioPage() {
  return (
    <PortfolioList 
      category="illustration"
      pageTitle="イラスト作品"
      pageDescription="クリエイターのイラスト作品を見る"
    />
  )
}
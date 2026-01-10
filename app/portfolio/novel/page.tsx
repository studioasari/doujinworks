import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: '小説作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿した小説作品を閲覧できます。ライトノベル、SS、二次創作など様々な小説作品をご覧ください。',
}

export default function NovelPortfolioPage() {
  return (
    <PortfolioList 
      category="novel"
      pageTitle="小説作品"
      pageDescription="クリエイターの小説作品を見る"
    />
  )
}
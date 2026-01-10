import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: 'マンガ作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿したマンガ作品を閲覧できます。同人誌、4コマ漫画、Webtoonなど様々なマンガ作品をご覧ください。',
}

export default function MangaPortfolioPage() {
  return (
    <PortfolioList 
      category="manga"
      pageTitle="マンガ作品"
      pageDescription="クリエイターのマンガ作品を見る"
    />
  )
}
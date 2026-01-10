import PortfolioList from '@/app/components/PortfolioList'

export const metadata = {
  title: '作品一覧 | 同人ワークス',
  description: 'クリエイターが投稿した作品を閲覧できます。イラスト、マンガ、小説、音楽、ボイス、動画など様々なジャンルの作品をご覧ください。',
}

export default function PortfolioPage() {
  return <PortfolioList />
}
import { Metadata } from 'next'
import PortfolioList from '@/app/components/PortfolioList'

export const metadata: Metadata = {
  title: '作品一覧',
  description: 'クリエイターの作品一覧。イラスト、マンガ、小説、音楽、ボイス、動画など様々なジャンルの作品を探せます。',
}

export default function PortfolioPage() {
  return (
    <PortfolioList 
      pageTitle="作品一覧" 
      pageDescription="クリエイターの作品を探す" 
    />
  )
}
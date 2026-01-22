import { Metadata } from 'next'
import PortfolioList from '@/app/components/PortfolioList'

export const metadata: Metadata = {
  title: 'イラスト作品一覧',
  description: 'イラストレーターの作品一覧。',
}

export default function IllustrationPage() {
  return (
    <PortfolioList 
      category="illustration"
      pageTitle="イラスト" 
      pageDescription="イラスト作品を探す" 
    />
  )
}
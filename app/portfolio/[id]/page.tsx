import { Metadata } from 'next'
import PortfolioDetailClient from './client'

export const metadata: Metadata = {
  title: '作品詳細',
  description: 'クリエイターの作品詳細ページ',
}

export default function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <PortfolioDetailClient params={params} />
}
import { Metadata } from 'next'
import { supabase } from '@/utils/supabase'
import PortfolioDetailClient from './client'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  const { data: work } = await supabase
    .from('portfolio_items')
    .select('title, description, image_url, image_urls')
    .eq('id', id)
    .single()

  if (!work) {
    return {
      title: '作品が見つかりません',
    }
  }

  const imageUrl = work.image_urls?.[0] || work.image_url || undefined

  return {
    title: work.title,
    description: work.description || undefined,
    openGraph: {
      title: work.title,
      description: work.description || undefined,
      images: imageUrl ? [imageUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: work.title,
      description: work.description || undefined,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default function PortfolioDetailPage({ params }: Props) {
  return <PortfolioDetailClient params={params} />
}
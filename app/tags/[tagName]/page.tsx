import { Metadata } from 'next'
import TagPageClient from './client'

type Props = {
  params: { tagName: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tagName = decodeURIComponent(params.tagName)
  
  return {
    title: `#${tagName} の作品一覧 | サイト名`,
    description: `「${tagName}」タグが付いた作品の一覧ページです。`,
    openGraph: {
      title: `#${tagName} の作品一覧`,
      description: `「${tagName}」タグが付いた作品の一覧ページです。`,
    },
  }
}

export default function TagPage({ params }: Props) {
  return <TagPageClient />
}
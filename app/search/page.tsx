import { Metadata } from 'next'
import { SearchPageClient } from './client'

export const metadata: Metadata = {
  title: '検索 | 同人ワークス',
  description: '作品、クリエイター、依頼、サービスを検索できます。',
}

export default function SearchPage() {
  return <SearchPageClient />
}
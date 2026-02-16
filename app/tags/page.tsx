import { Metadata } from 'next'
import TagList from '@/app/components/TagList'

export const metadata: Metadata = {
  title: 'タグ一覧 | 同人ワークス',
  description: '作品に付けられたタグの一覧ページです。タグから作品を探すことができます。',
  openGraph: {
    title: 'タグ一覧',
    description: '作品に付けられたタグの一覧ページです。タグから作品を探すことができます。',
  },
}

export default function TagListPage() {
  return <TagList />
}
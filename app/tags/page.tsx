import { Metadata } from 'next'
import TagListClient from './client'

export const metadata: Metadata = {
  title: 'タグ一覧 | サイト名',
  description: '作品に付けられたタグの一覧ページです。タグから作品を探すことができます。',
  openGraph: {
    title: 'タグ一覧',
    description: '作品に付けられたタグの一覧ページです。タグから作品を探すことができます。',
  },
}

export default function TagListPage() {
  return <TagListClient />
}
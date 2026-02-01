import { Metadata } from 'next'
import BookmarksClient from './client'

export const metadata: Metadata = {
  title: '保存した作品 | 同人ワークス',
  description: 'あなたが保存した作品の一覧です。',
}

export default function BookmarksPage() {
  return <BookmarksClient />
}
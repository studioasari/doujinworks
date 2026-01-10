import { Metadata } from 'next'
import UploadMangaClient from './client'

export const metadata: Metadata = {
  title: 'マンガをアップロード | 同人ワークス',
}

export default function UploadMangaPage() {
  return <UploadMangaClient />
}
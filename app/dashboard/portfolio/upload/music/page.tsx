import { Metadata } from 'next'
import UploadMusicClient from './client'

export const metadata: Metadata = {
  title: '音楽をアップロード | 同人ワークス',
}

export default function UploadMusicPage() {
  return <UploadMusicClient />
}
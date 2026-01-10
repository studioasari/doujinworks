import { Metadata } from 'next'
import UploadNovelClient from './client'

export const metadata: Metadata = {
  title: '小説をアップロード | 同人ワークス',
}

export default function UploadNovelPage() {
  return <UploadNovelClient />
}
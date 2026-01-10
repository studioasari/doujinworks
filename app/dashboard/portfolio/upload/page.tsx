import { Metadata } from 'next'
import UploadSelectClient from './client'

export const metadata: Metadata = {
  title: '作品アップロード | 同人ワークス',
}

export default function UploadSelectPage() {
  return <UploadSelectClient />
}
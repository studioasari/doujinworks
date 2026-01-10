import { Metadata } from 'next'
import UploadVideoClient from './client'

export const metadata: Metadata = {
  title: '動画をアップロード | 同人ワークス',
}

export default function UploadVideoPage() {
  return <UploadVideoClient />
}
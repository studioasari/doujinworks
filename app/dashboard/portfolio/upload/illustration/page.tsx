import { Metadata } from 'next'
import UploadIllustrationClient from './client'

export const metadata: Metadata = {
  title: 'イラストをアップロード | 同人ワークス',
}

export default function UploadIllustrationPage() {
  return <UploadIllustrationClient />
}
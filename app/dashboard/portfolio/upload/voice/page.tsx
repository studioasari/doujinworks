import { Metadata } from 'next'
import UploadVoiceClient from './client'

export const metadata: Metadata = {
  title: 'ボイスをアップロード | 同人ワークス',
}

export default function UploadVoicePage() {
  return <UploadVoiceClient />
}
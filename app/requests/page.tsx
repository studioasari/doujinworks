import { Metadata } from 'next'
import RequestsClient from './client'

export const metadata: Metadata = {
  title: '依頼一覧 | 同人ワークス',
  description: '公開されている依頼を探して応募しましょう。イラスト、マンガ、小説、音楽など様々なジャンルの依頼があります。',
}

export default function RequestsPage() {
  return <RequestsClient />
}
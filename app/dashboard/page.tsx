import { Metadata } from 'next'
import DashboardClient from './client'

export const metadata: Metadata = {
  title: 'ダッシュボード | 同人ワークス',
  description: '進行中の仕事や応募状況を確認できます。',
}

export default function DashboardPage() {
  return <DashboardClient />
}
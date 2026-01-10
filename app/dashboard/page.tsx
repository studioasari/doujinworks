import { Metadata } from 'next'
import DashboardClient from './client'

export const metadata: Metadata = {
  title: 'ダッシュボード | 同人ワークス',
}

export default function DashboardPage() {
  return <DashboardClient />
}
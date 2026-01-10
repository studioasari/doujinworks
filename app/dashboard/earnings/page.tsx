import { Metadata } from 'next'
import EarningsClient from './client'

export const metadata: Metadata = {
  title: '売上管理 | 同人ワークス',
}

export default function EarningsPage() {
  return <EarningsClient />
}
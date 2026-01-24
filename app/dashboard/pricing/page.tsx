import { Metadata } from 'next'
import PricingListClient from './client'

export const metadata: Metadata = {
  title: '料金表管理 | 同人ワークス',
}

export default function PricingPage() {
  return <PricingListClient />
}
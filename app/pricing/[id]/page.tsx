import { Metadata } from 'next'
import PricingDetailClient from './client'

export const metadata: Metadata = {
  title: '料金プラン | 同人ワークス',
}

export default function PricingDetailPage() {
  return <PricingDetailClient />
}
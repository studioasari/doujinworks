import { Metadata } from 'next'
import PricingNewClient from './client'

export const metadata: Metadata = {
  title: '料金プラン追加 | 同人ワークス',
}

export default function PricingNewPage() {
  return <PricingNewClient />
}
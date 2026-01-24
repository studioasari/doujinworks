import { Metadata } from 'next'
import PricingEditClient from './client'

export const metadata: Metadata = {
  title: '料金プラン編集 | 同人ワークス',
}

export default function PricingEditPage() {
  return <PricingEditClient />
}
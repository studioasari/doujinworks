import { Metadata } from 'next'
import LawClient from './client'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | 同人ワークス',
}

export default function LawPage() {
  return <LawClient />
}

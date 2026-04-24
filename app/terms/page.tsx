import { Metadata } from 'next'
import TermsClient from './client'

export const metadata: Metadata = {
  title: '利用規約 | 同人ワークス',
}

export default function TermsPage() {
  return <TermsClient />
}

import { Metadata } from 'next'
import PrivacyClient from './client'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | 同人ワークス',
}

export default function PrivacyPage() {
  return <PrivacyClient />
}

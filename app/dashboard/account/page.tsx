import { Metadata } from 'next'
import AccountClient from './client'

export const metadata: Metadata = {
  title: 'アカウント情報 | 同人ワークス',
}

export default function AccountPage() {
  return <AccountClient />
}
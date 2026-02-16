import type { Metadata } from 'next'
import AccountDeletedClient from './client'

export const metadata: Metadata = {
  title: 'アカウント削除済み | 同人ワークス',
}

export default function AccountDeletedPage() {
  return <AccountDeletedClient />
}
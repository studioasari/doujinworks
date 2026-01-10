import { Metadata } from 'next'
import BankAccountClient from './client'

export const metadata: Metadata = {
  title: '振込先設定 | 同人ワークス',
}

export default function BankAccountPage() {
  return <BankAccountClient />
}
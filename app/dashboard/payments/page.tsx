import { Metadata } from 'next'
import PaymentsClient from './client'

export const metadata: Metadata = {
  title: '支払い管理 | 同人ワークス',
}

export default function PaymentsPage() {
  return <PaymentsClient />
}
import { Metadata } from 'next'
import VerifyClient from './client'

export const metadata: Metadata = {
  title: '認証メール送信完了 | 同人ワークス',
  description: '認証メールを送信しました。メール内のリンクをクリックして登録を完了してください。',
}

export default function VerifyPage() {
  return <VerifyClient />
}
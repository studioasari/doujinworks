import { Metadata } from 'next'
import LoginClient from './client'

export const metadata: Metadata = {
  title: 'ログイン | 同人ワークス',
  description: '同人ワークスのログインページです。メールアドレス、ユーザーID、またはSNSアカウントでログインできます。',
}

export default function LoginPage() {
  return <LoginClient />
}
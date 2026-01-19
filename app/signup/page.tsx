import { Metadata } from 'next'
import SignupClient from './client'

export const metadata: Metadata = {
  title: '新規会員登録 | 同人ワークス',
  description: '同人ワークスの新規会員登録ページです。メールアドレスまたはSNSアカウントで簡単に登録できます。',
}

export default function SignupPage() {
  return <SignupClient />
}
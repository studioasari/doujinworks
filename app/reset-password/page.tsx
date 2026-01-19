import { Metadata } from 'next'
import ResetPasswordClient from './client'

export const metadata: Metadata = {
  title: 'パスワード再設定 | 同人ワークス',
  description: 'パスワードを忘れた場合はこちらから再設定できます。',
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
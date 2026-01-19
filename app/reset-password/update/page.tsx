import { Metadata } from 'next'
import { UpdatePasswordClient } from './client'

export const metadata: Metadata = {
  title: '新しいパスワードを設定 | 同人ワークス',
  description: '新しいパスワードを設定してください。',
}

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />
}
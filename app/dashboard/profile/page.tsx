import { Metadata } from 'next'
import ProfileClient from './client'

export const metadata: Metadata = {
  title: 'プロフィール編集 | 同人ワークス',
}

export default function ProfilePage() {
  return <ProfileClient />
}
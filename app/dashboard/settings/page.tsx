import { Metadata } from 'next'
import SettingsClient from './client'

export const metadata: Metadata = {
  title: 'アカウント設定 | 同人ワークス',
}

export default function SettingsPage() {
  return <SettingsClient />
}
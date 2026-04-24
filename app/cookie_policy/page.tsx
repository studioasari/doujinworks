import { Metadata } from 'next'
import CookiePolicyClient from './client'

export const metadata: Metadata = {
  title: '外部送信ポリシー | 同人ワークス',
}

export default function CookiePolicyPage() {
  return <CookiePolicyClient />
}

import CreateRequestClient from './client'

export const metadata = {
  title: '依頼を作成 | 同人ワークス',
  description: 'クリエイターへの依頼を作成します',
}

export default function CreateRequestPage() {
  return <CreateRequestClient />
}
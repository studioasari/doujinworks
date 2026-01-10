import { Metadata } from 'next'
import PortfolioManageClient from './client'

export const metadata: Metadata = {
  title: '作品管理 | 同人ワークス',
}

export default function PortfolioManagePage() {
  return <PortfolioManageClient />
}
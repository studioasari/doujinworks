import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ContractDetailPage from './client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Props = {
  params: Promise<{ id: string; contractId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contractId } = await params
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const { data } = await supabase
    .from('work_contracts')
    .select('work_requests(title)')
    .eq('id', contractId)
    .single()

  const title = (data?.work_requests as any)?.title || '契約詳細'

  return {
    title: `${title} - 契約詳細 | 同人ワークス`,
    description: `${title}の契約詳細ページです`,
  }
}

export default function Page() {
  return <ContractDetailPage />
}
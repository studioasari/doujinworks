import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import RequestDetailPage from './client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const { data } = await supabase
    .from('work_requests')
    .select('title')
    .eq('id', id)
    .single()

  const title = data?.title || '依頼詳細'

  return {
    title: `${title} | 同人ワークス`,
    description: `${title}の依頼詳細ページです`,
  }
}

export default function Page() {
  return <RequestDetailPage />
}
import { Metadata } from 'next'
import { supabase } from '@/utils/supabase'
import CreatorDetailClient from './client'

type Props = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  
  const { data: creator } = await supabase
    .from('profiles')
    .select('display_name, bio, avatar_url')
    .eq('username', username)
    .single()

  if (!creator) {
    return {
      title: 'クリエイターが見つかりません',
    }
  }

  return {
    title: `${creator.display_name || username} - クリエイタープロフィール`,
    description: creator.bio || `${creator.display_name || username}のプロフィールページ`,
    openGraph: {
      title: `${creator.display_name || username}`,
      description: creator.bio || undefined,
      images: creator.avatar_url ? [creator.avatar_url] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${creator.display_name || username}`,
      description: creator.bio || undefined,
      images: creator.avatar_url ? [creator.avatar_url] : undefined,
    },
  }
}

export default function CreatorDetailPage({ params }: Props) {
  return <CreatorDetailClient params={params} />
}
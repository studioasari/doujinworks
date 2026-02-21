import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const CATEGORY_INFO: { [key: string]: { name: string; icon: string } } = {
  illustration: { name: 'イラスト', icon: 'fa-solid fa-image' },
  manga: { name: 'マンガ', icon: 'fa-solid fa-book' },
  novel: { name: '小説', icon: 'fa-solid fa-file-lines' },
  music: { name: '音楽', icon: 'fa-solid fa-music' },
  voice: { name: 'ボイス', icon: 'fa-solid fa-microphone' },
  video: { name: '動画', icon: 'fa-solid fa-video' }
}

// GET: 下書き一覧取得
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('drafts')
      .select('*')
      .eq('creator_id', user.id)
      .order('updated_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('下書き取得エラー:', error)
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
    }

    const drafts = (data || []).map(draft => ({
      ...draft,
      categoryName: CATEGORY_INFO[draft.category]?.name || draft.category,
      categoryIcon: CATEGORY_INFO[draft.category]?.icon || 'fa-solid fa-file'
    }))

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('下書き取得エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 下書き新規作成
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('drafts')
      .insert({
        creator_id: user.id,
        category: body.category,
        title: body.title || '',
        description: body.description || '',
        tags: body.tags || [],
        rating: body.rating || 'general',
        is_original: body.is_original ?? false,
        allow_comments: body.allow_comments ?? true,
        is_public: body.is_public ?? true,
        image_urls: body.image_urls || null
      })
      .select()
      .single()

    if (error) {
      console.error('下書き作成エラー:', error)
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
    }

    return NextResponse.json({ draft: data })
  } catch (error) {
    console.error('下書き作成エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
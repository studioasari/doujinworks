import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // Service Role Key を使用（サーバーサイドのみ）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // profilesからuser_idを取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'ユーザーIDが見つかりません' }, { status: 404 })
    }
    
    // auth.usersからemailを取得
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }
    
    return NextResponse.json({ email: userData.user.email })
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
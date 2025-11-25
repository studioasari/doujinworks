import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username } = body
    
    console.log('Received username:', username)
    
    if (!username) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // 環境変数の確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Service Role Key exists:', !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables')
      return NextResponse.json({ error: '環境変数が設定されていません' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    
    // profilesからuser_idを取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .single()
    
    console.log('Profile query result:', { profile, profileError })
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'ユーザーIDが見つかりません' }, { status: 404 })
    }
    
    // auth.usersからemailを取得
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
    
    console.log('User query result:', { userData: userData?.user?.email, userError })
    
    if (userError || !userData.user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }
    
    return NextResponse.json({ email: userData.user.email })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
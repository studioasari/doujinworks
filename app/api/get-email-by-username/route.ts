import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username } = body
    
    if (!username) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: '環境変数が設定されていません',
        debug: { 
          hasUrl: !!supabaseUrl, 
          hasKey: !!serviceRoleKey 
        }
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // profilesからuser_idを取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .single()
    
    if (profileError) {
      return NextResponse.json({ 
        error: 'ユーザーIDが見つかりません',
        debug: { code: profileError.code, message: profileError.message }
      }, { status: 404 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'ユーザーIDが見つかりません' }, { status: 404 })
    }
    
    // auth.usersからemailを取得
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
    
    if (userError) {
      return NextResponse.json({ 
        error: 'ユーザー情報の取得に失敗しました',
        debug: { message: userError.message }
      }, { status: 500 })
    }

    if (!userData.user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }
    
    return NextResponse.json({ email: userData.user.email })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'サーバーエラーが発生しました',
      debug: { message: error.message }
    }, { status: 500 })
  }
}
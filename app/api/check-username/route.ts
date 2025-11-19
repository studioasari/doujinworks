import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 予約語リスト
const RESERVED_USERNAMES = [
  'admin', 'root', 'system', 'api', 'login', 'signup', 
  'settings', 'test', 'user', 'dashboard', 'profile',
  'messages', 'portfolio', 'requests', 'creators'
]

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    // 1. 基本バリデーション
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        available: false, 
        error: 'ユーザーIDを入力してください' 
      })
    }

    const cleanUsername = username.toLowerCase().trim()

    // 2. 文字数チェック
    if (cleanUsername.length < 4) {
      return NextResponse.json({ 
        available: false, 
        error: '4文字以上で入力してください' 
      })
    }

    if (cleanUsername.length > 20) {
      return NextResponse.json({ 
        available: false, 
        error: '20文字以内で入力してください' 
      })
    }

    // 3. 形式チェック（英字始まり、英数字+アンダースコアのみ）
    const usernameRegex = /^[a-z][a-z0-9_]*$/
    if (!usernameRegex.test(cleanUsername)) {
      if (!/^[a-z]/.test(cleanUsername)) {
        return NextResponse.json({ 
          available: false, 
          error: '英字で始めてください' 
        })
      }
      return NextResponse.json({ 
        available: false, 
        error: '使用できない文字が含まれています' 
      })
    }

    // 4. 予約語チェック
    if (RESERVED_USERNAMES.includes(cleanUsername)) {
      return NextResponse.json({ 
        available: false, 
        error: 'このIDは使用できません' 
      })
    }

    // 5. 重複チェック
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = データなし（使用可能）以外のエラー
      throw error
    }

    if (data) {
      return NextResponse.json({ 
        available: false, 
        error: 'このIDは既に使用されています' 
      })
    }

    // 6. 利用可能
    return NextResponse.json({ 
      available: true, 
      username: cleanUsername 
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json({ 
      available: false, 
      error: 'エラーが発生しました' 
    }, { status: 500 })
  }
}
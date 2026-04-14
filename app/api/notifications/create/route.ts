import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notificationCreateLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 通知作成API
 *
 * ブラウザから直接 notifications テーブルに INSERT する代わりに、
 * このAPIを経由してサーバー側で INSERT する。
 * これにより、緩い RLS ポリシー（認証済みなら誰でも INSERT 可能）を
 * 削除できる。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. レート制限内であること（1分あたり60件）
 *
 * 将来の改善:
 *  - 送信者が取引当事者であることの検証（通知種別ごとに異なるため別タスク）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. ログイン確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // 2. レート制限チェック（user.id ベース）
    const { success: withinLimit } = await safeLimit(
      notificationCreateLimiter,
      user.id,
      'notificationCreate'
    )

    if (!withinLimit) {
      return NextResponse.json(
        { error: '通知の作成頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // 3. リクエストボディのバリデーション
    let body: {
      profileId?: unknown
      type?: unknown
      title?: unknown
      message?: unknown
      link?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    const { profileId, type, title, message, link } = body

    if (
      typeof profileId !== 'string' || profileId.length === 0 ||
      typeof type !== 'string' || type.length === 0 ||
      typeof title !== 'string' || title.length === 0 ||
      typeof message !== 'string' || message.length === 0
    ) {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    if (link !== undefined && link !== null && typeof link !== 'string') {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    // 4. notifications INSERT（adminClient で RLS バイパス）
    const admin = createAdminClient()
    const { error: insertError } = await admin
      .from('notifications')
      .insert({
        profile_id: profileId,
        type,
        title,
        message,
        link: link || null,
      })

    if (insertError) {
      console.error('[notifications/create] INSERT エラー:', insertError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // 5. 成功
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notifications/create] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

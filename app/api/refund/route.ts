import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { refundLimiter, safeLimit } from '@/utils/rateLimit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

/**
 * 返金API
 *
 * キャンセル承認時に呼び出され、Stripe で返金を実行し、
 * DB に返金記録を保存する。
 *
 * 認可（2系統）:
 *  A) cron 経由: Authorization ヘッダーが CRON_SECRET と一致
 *  B) ブラウザ経由: ログイン済み + 契約の当事者（依頼者 or クリエイター）
 *
 * 安全対策:
 *  - 返金済みチェック（二重返金防止）
 *  - DB 更新失敗時のエラーハンドリング
 *  - エラー詳細を外部に返さない（console.error でログのみ）
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // ステップ1: cron 経由 or ブラウザ経由を判定
    const authHeader = request.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

    // ボディ取得（cron・ブラウザ共通、request.json() は1回のみ呼べるため先頭で取得）
    let body: { workContractId?: unknown; reason?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    const workContractId = body.workContractId
    const reason = typeof body.reason === 'string' ? body.reason : undefined

    if (typeof workContractId !== 'string' || workContractId.length === 0) {
      return NextResponse.json(
        { error: 'workContractId が不正です' },
        { status: 400 }
      )
    }

    // ステップ2: 契約を取得（cron・ブラウザ共通、1回のみ）
    // 認証チェック用の requester_id と返金処理用のカラムをまとめて取得
    const { data: contract, error: fetchError } = await admin
      .from('work_contracts')
      .select('*, work_request:work_requests(id, title, requester_id)')
      .eq('id', workContractId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ3: ブラウザ経由の場合、認証・認可チェック
    if (!isCron) {
      // 3-1. ログイン確認
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'ログインが必要です' },
          { status: 401 }
        )
      }

      // 3-2. profiles.id を取得（auth uid → profiles.id 変換）
      const { data: myProfile, error: profileError } = await admin
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !myProfile) {
        return NextResponse.json(
          { error: 'プロフィールが見つかりません' },
          { status: 404 }
        )
      }

      // 3-3. 当事者チェック（ステップ2で取得した contract を使用）
      const workRequest = contract.work_request as
        | { requester_id: string }
        | { requester_id: string }[]
        | null
      const requesterId = Array.isArray(workRequest)
        ? workRequest[0]?.requester_id
        : workRequest?.requester_id

      const isRequester = requesterId === myProfile.id
      const isContractor = contract.contractor_id === myProfile.id

      if (!isRequester && !isContractor) {
        return NextResponse.json(
          { error: 'この操作を行う権限がありません' },
          { status: 403 }
        )
      }

      // 3-4. レート制限（ブラウザ経由のみ、cron はスキップ）
      const { success: withinLimit } = await safeLimit(
        refundLimiter,
        user.id,
        'refund'
      )
      if (!withinLimit) {
        return NextResponse.json(
          { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
          { status: 429 }
        )
      }
    }

    // ステップ4: 返金済みチェック（二重返金防止）
    if (contract.refund_id) {
      return NextResponse.json(
        { error: 'この契約は既に返金済みです' },
        { status: 409 }
      )
    }

    // ステップ5: payment_intent_id の存在チェック
    if (!contract.payment_intent_id) {
      return NextResponse.json(
        { error: 'この契約に決済情報がありません' },
        { status: 400 }
      )
    }

    // ステップ6: Stripe 返金実行
    const refund = await stripe.refunds.create({
      payment_intent: contract.payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        work_contract_id: workContractId,
        work_request_id: contract.work_request_id,
        reason: reason || 'Cancellation approved'
      }
    })

    console.log('[refund] Stripe 返金完了:', refund.id)

    // ステップ7: DB 更新

    // 7-1. work_contracts に refund_id を保存
    const { error: updateContractError } = await admin
      .from('work_contracts')
      .update({
        refund_id: refund.id,
        refunded_at: new Date().toISOString()
      })
      .eq('id', workContractId)

    if (updateContractError) {
      // Stripe 返金は完了済みだが DB 更新に失敗。深刻な不整合。
      console.error('[refund] work_contracts 更新失敗（Stripe返金は完了済み）:', updateContractError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // 7-2. work_requests にも refund 情報を保存（互換性のため）
    if (contract.work_request_id) {
      const { error: updateRequestError } = await admin
        .from('work_requests')
        .update({
          refund_id: refund.id,
          refunded_at: new Date().toISOString()
        })
        .eq('id', contract.work_request_id)

      if (updateRequestError) {
        // work_contracts は更新済みなので 500 は返さないが、ログは残す
        console.error('[refund] work_requests 更新失敗:', updateRequestError)
      }
    }

    // ステップ8: 成功レスポンス
    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status
    })

  } catch (error) {
    console.error('[refund] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

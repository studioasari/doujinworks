import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/utils/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// 先行リクエストの完了を待つ猶予時間。
// Stripe のリトライは最初の数回が1分以内に来るため、
// 5分あれば先行リクエストの完了を待つには十分。
const PROCESSING_TIMEOUT_MINUTES = 5

/**
 * Stripe Webhook ハンドラ
 *
 * 冪等性対策:
 *  stripe_events テーブルで event.id の重複を検知し、
 *  同じイベントを2回以上処理しないようにする。
 *
 * 処理するイベント:
 *  - checkout.session.completed（仮払い完了）
 *
 * 既知の修正:
 *  - signature ヘッダーの null チェック追加（旧: ! assert でクラッシュ）
 *  - work_requests 更新失敗時に 500 を返す（旧: 200 でスルー）
 */
export async function POST(request: NextRequest) {
  // ステップ1: リクエストの読み取りと signature の null チェック
  let body: string
  let signature: string

  try {
    body = await request.text()
  } catch {
    return NextResponse.json(
      { error: 'リクエストの読み取りに失敗しました' },
      { status: 400 }
    )
  }

  const rawSignature = request.headers.get('stripe-signature')
  if (!rawSignature) {
    return NextResponse.json(
      { error: 'stripe-signature ヘッダーがありません' },
      { status: 400 }
    )
  }
  signature = rawSignature

  // ステップ2: 署名検証
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[webhook] 署名検証エラー:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Webhook署名検証エラー' }, { status: 400 })
  }

  // ステップ3: event.id と event.type を取り出す
  const eventId = event.id
  const eventType = event.type

  const admin = createAdminClient()

  // ステップ4: stripe_events に INSERT を試みる（冪等性チェック）
  const { error: insertError } = await admin
    .from('stripe_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      status: 'processing',
    })

  if (insertError) {
    // 主キー重複 = 既に受信済み
    if (insertError.code === '23505') {
      // 既存レコードを取得
      const { data: existing } = await admin
        .from('stripe_events')
        .select('status, received_at')
        .eq('event_id', eventId)
        .single()

      if (!existing) {
        // 取得できない場合は安全のため 500（Stripe がリトライ）
        console.error('[webhook] stripe_events レコード取得失敗:', eventId)
        return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
      }

      // 既に処理完了
      if (existing.status === 'completed') {
        return NextResponse.json({ received: true })
      }

      // 処理中（先行リクエストが実行中）
      if (existing.status === 'processing') {
        const receivedAt = new Date(existing.received_at).getTime()
        const now = Date.now()
        const elapsedMinutes = (now - receivedAt) / (1000 * 60)

        if (elapsedMinutes < PROCESSING_TIMEOUT_MINUTES) {
          // 5分以内 → 先行リクエストの完了を待つため 500 でリトライさせる
          return NextResponse.json(
            { error: '別のリクエストが処理中です' },
            { status: 500 }
          )
        }

        // 5分超過 → 先行リクエストがクラッシュした可能性、再処理を許可
        console.warn('[webhook] processing タイムアウト、再処理:', eventId)
        await admin
          .from('stripe_events')
          .update({
            received_at: new Date().toISOString(),
            status: 'processing',
            error_message: null,
          })
          .eq('event_id', eventId)
      } else if (existing.status === 'failed') {
        // failed → 再処理を許可
        console.warn('[webhook] failed イベントを再処理:', eventId)
        await admin
          .from('stripe_events')
          .update({
            status: 'processing',
            error_message: null,
          })
          .eq('event_id', eventId)
      }

      // ↓ ステップ5 へ続行（再処理）
    } else {
      // 主キー重複以外のエラー
      console.error('[webhook] stripe_events INSERT エラー:', insertError)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
  }

  // ステップ5: イベント種別に応じた処理
  try {
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const contractId = session.metadata?.contract_id

      if (!contractId) {
        await updateEventStatus(admin, eventId, 'failed', 'contract_id が metadata にありません')
        return NextResponse.json(
          { error: 'contract_id が見つかりません' },
          { status: 400 }
        )
      }

      // 5-2. work_contracts の現在の status を確認（DB負荷最適化）
      const { data: currentContract } = await admin
        .from('work_contracts')
        .select('status')
        .eq('id', contractId)
        .single()

      if (currentContract?.status === 'paid') {
        // 既に paid → DB 更新をスキップして完了扱い
        await updateEventStatus(admin, eventId, 'completed', null)
        console.log('[webhook] 既に paid、スキップ - 契約ID:', contractId)
        return NextResponse.json({ received: true })
      }

      // 5-3. work_contracts を更新
      const paidAt = new Date().toISOString()
      const { data: contractData, error: contractError } = await admin
        .from('work_contracts')
        .update({
          status: 'paid',
          paid_at: paidAt,
          payment_intent_id: session.payment_intent as string,
        })
        .eq('id', contractId)
        .select('work_request_id')
        .single()

      if (contractError) {
        console.error('[webhook] work_contracts 更新エラー:', contractError)
        await updateEventStatus(admin, eventId, 'failed', `work_contracts 更新失敗: ${contractError.message}`)
        return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
      }

      console.log('[webhook] 仮払い完了 - 契約ID:', contractId)
    }

    // ステップ6: 処理完了
    await updateEventStatus(admin, eventId, 'completed', null)
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[webhook] 予期しないエラー:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    await updateEventStatus(admin, eventId, 'failed', errorMessage)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

/**
 * stripe_events のステータスを更新するヘルパー
 */
async function updateEventStatus(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  status: 'completed' | 'failed',
  errorMessage: string | null
) {
  const updateData: Record<string, unknown> = { status, error_message: errorMessage }
  if (status === 'completed') {
    updateData.processed_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('stripe_events')
    .update(updateData)
    .eq('event_id', eventId)

  if (error) {
    // stripe_events の更新失敗は致命的ではないが、ログには残す
    console.error('[webhook] stripe_events 更新失敗:', error)
  }
}

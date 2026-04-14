import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

/**
 * Stripe Checkout Session 作成API
 *
 * 仮払い（エスクロー決済）のための Stripe 決済ページを作成する。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. 対象 work_contract の依頼者（work_request.requester_id）本人であること
 */
export async function POST(request: NextRequest) {
  try {
    // ステップ1: ログイン確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // ステップ2: リクエストボディのバリデーション
    let body: { contractId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    const contractId = body.contractId
    if (typeof contractId !== 'string' || contractId.length === 0) {
      return NextResponse.json(
        { error: 'contractId が不正です' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // ステップ3: プロフィール取得（auth uid → profiles.id）
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

    // ステップ4: 契約を取得
    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select(`
        *,
        work_request:work_requests!work_contracts_work_request_id_fkey(
          id,
          title,
          requester_id
        ),
        contractor:profiles!work_contracts_contractor_id_fkey(display_name)
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      console.error('[create-checkout-session] 契約取得エラー:', contractError)
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ5: 本人確認（依頼者本人か）
    const workRequest = contract.work_request as
      | { id: string; title: string; requester_id: string }
      | { id: string; title: string; requester_id: string }[]
      | null
    const requesterId = Array.isArray(workRequest)
      ? workRequest[0]?.requester_id
      : workRequest?.requester_id

    if (!requesterId || requesterId !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ6: 既存のバリデーション
    if (contract.status !== 'contracted') {
      return NextResponse.json(
        { error: 'この契約は仮払い待ち状態ではありません' },
        { status: 400 }
      )
    }

    if (!contract.final_price || contract.final_price < 50) {
      return NextResponse.json(
        { error: '決済金額は50円以上である必要があります' },
        { status: 400 }
      )
    }

    // ステップ7: Stripe Checkout Session を作成
    const workRequestData = Array.isArray(workRequest) ? workRequest[0] : workRequest
    const contractor = contract.contractor as { display_name: string } | { display_name: string }[] | null
    const contractorData = Array.isArray(contractor) ? contractor[0] : contractor

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `仮払い: ${workRequestData?.title || '依頼'}`,
              description: `クリエイター: ${contractorData?.display_name || '名前未設定'}`,
            },
            unit_amount: contract.final_price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/requests/${workRequestData?.id}/contracts/${contractId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/requests/${workRequestData?.id}/contracts/${contractId}?payment=cancel`,
      metadata: {
        contract_id: contractId,
        work_request_id: contract.work_request_id,
      },
    })

    // ステップ8: 成功レスポンス
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[create-checkout-session] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

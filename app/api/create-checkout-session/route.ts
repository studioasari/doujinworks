import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json()

    // 依頼情報を取得
    const { data: workRequest, error } = await supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(display_name)')
      .eq('id', requestId)
      .single()

    if (error || !workRequest) {
      return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
    }

    if (!workRequest.final_price) {
      return NextResponse.json({ error: '確定金額が設定されていません' }, { status: 400 })
    }

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `仮払い: ${workRequest.title}`,
              description: `依頼者: ${workRequest.profiles.display_name || '名前未設定'}`,
            },
            unit_amount: workRequest.final_price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/requests/${requestId}/status?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/requests/${requestId}/status?payment=cancel`,
      metadata: {
        request_id: requestId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout Session作成エラー:', err)
    return NextResponse.json(
      { error: 'セッション作成に失敗しました' },
      { status: 500 }
    )
  }
}
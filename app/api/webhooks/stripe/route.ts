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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook署名検証エラー:', err.message)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
  }

  // 決済完了イベント
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const contractId = session.metadata?.contract_id

    if (contractId) {
      // work_contracts テーブルを更新
      const { error } = await supabase
        .from('work_contracts')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_intent_id: session.payment_intent as string,
        })
        .eq('id', contractId)

      if (error) {
        console.error('DB更新エラー:', error)
        return NextResponse.json({ error: 'Database Error' }, { status: 500 })
      }

      console.log('仮払い完了 - 契約ID:', contractId)
    }
  }

  return NextResponse.json({ received: true })
}
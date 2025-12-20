import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { workRequestId, reason } = await req.json()

    if (!workRequestId) {
      return NextResponse.json(
        { error: 'workRequestId is required' },
        { status: 400 }
      )
    }

    // work_requestsから情報を取得
    const { data: workRequest, error: fetchError } = await supabase
      .from('work_requests')
      .select('*')
      .eq('id', workRequestId)
      .single()

    if (fetchError || !workRequest) {
      return NextResponse.json(
        { error: 'Work request not found' },
        { status: 404 }
      )
    }

    // payment_intent_idがない場合はエラー
    if (!workRequest.payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment found for this request' },
        { status: 400 }
      )
    }

    // Stripe返金処理
    const refund = await stripe.refunds.create({
      payment_intent: workRequest.payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        work_request_id: workRequestId,
        reason: reason || 'Cancellation approved'
      }
    })

    console.log('Refund created:', refund.id)

    // work_requestsにrefund_idを保存
    const { error: updateError } = await supabase
      .from('work_requests')
      .update({
        refund_id: refund.id,
        refunded_at: new Date().toISOString()
      })
      .eq('id', workRequestId)

    if (updateError) {
      console.error('Error updating work request:', updateError)
    }

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status
    })

  } catch (error: any) {
    console.error('Refund error:', error)
    
    return NextResponse.json(
      { 
        error: 'Refund failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
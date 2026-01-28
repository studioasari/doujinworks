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
    const { workContractId, reason } = await req.json()

    if (!workContractId) {
      return NextResponse.json(
        { error: 'workContractId is required' },
        { status: 400 }
      )
    }

    // work_contractsから情報を取得
    const { data: contract, error: fetchError } = await supabase
      .from('work_contracts')
      .select('*, work_request:work_requests(id, title)')
      .eq('id', workContractId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // payment_intent_idがない場合はエラー
    if (!contract.payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment found for this contract' },
        { status: 400 }
      )
    }

    // Stripe返金処理
    const refund = await stripe.refunds.create({
      payment_intent: contract.payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        work_contract_id: workContractId,
        work_request_id: contract.work_request_id,
        reason: reason || 'Cancellation approved'
      }
    })

    console.log('Refund created:', refund.id)

    // work_contractsにrefund_idを保存
    const { error: updateError } = await supabase
      .from('work_contracts')
      .update({
        refund_id: refund.id,
        refunded_at: new Date().toISOString()
      })
      .eq('id', workContractId)

    if (updateError) {
      console.error('Error updating contract:', updateError)
    }

    // work_requestsにもrefund情報を保存（互換性のため）
    if (contract.work_request_id) {
      await supabase
        .from('work_requests')
        .update({
          refund_id: refund.id,
          refunded_at: new Date().toISOString()
        })
        .eq('id', contract.work_request_id)
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
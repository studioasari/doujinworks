import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { workRequestId, reason } = await req.json()

    if (!workRequestId) {
      return new Response(
        JSON.stringify({ error: 'workRequestId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-11-20.acacia'
    })

    // work_requestsから情報を取得
    const { data: workRequest, error: fetchError } = await supabase
      .from('work_requests')
      .select('*')
      .eq('id', workRequestId)
      .single()

    if (fetchError || !workRequest) {
      return new Response(
        JSON.stringify({ error: 'Work request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 既に返金済みの場合はスキップ
    if (workRequest.refund_id) {
      console.log(`Already refunded: ${workRequestId}, refund_id: ${workRequest.refund_id}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Already refunded', refund_id: workRequest.refund_id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // payment_intent_idがない場合はスキップ（エラーにはしない）
    if (!workRequest.payment_intent_id) {
      console.log(`No payment_intent_id for ${workRequestId}, skipping refund`)
      return new Response(
        JSON.stringify({ success: true, message: 'No payment to refund' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: refund.id,
        amount: refund.amount,
        status: refund.status
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Refund error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Refund failed', 
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
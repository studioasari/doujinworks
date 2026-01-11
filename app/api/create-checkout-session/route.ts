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
    const { contractId } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: 'contractIdが指定されていません' }, { status: 400 })
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
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
      console.error('契約取得エラー:', contractError)
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 })
    }

    if (contract.status !== 'contracted') {
      return NextResponse.json({ error: 'この契約は仮払い待ち状態ではありません' }, { status: 400 })
    }

    if (!contract.final_price || contract.final_price < 50) {
      return NextResponse.json({ error: '決済金額は50円以上である必要があります' }, { status: 400 })
    }

    const workRequest = contract.work_request as any
    const contractor = contract.contractor as any

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `仮払い: ${workRequest?.title || '依頼'}`,
              description: `クリエイター: ${contractor?.display_name || '名前未設定'}`,
            },
            unit_amount: contract.final_price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/requests/${workRequest?.id}/contracts/${contractId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/requests/${workRequest?.id}/contracts/${contractId}?payment=cancel`,
      metadata: {
        contract_id: contractId,
        work_request_id: contract.work_request_id,
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
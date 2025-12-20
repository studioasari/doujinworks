import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 7日前の日時を計算
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    console.log('Checking for cancellation requests older than:', sevenDaysAgo.toISOString())

    // 7日以上経過したpendingのキャンセル申請を取得
    // 1回のCron実行で最大50件まで処理
    const { data: requests, error } = await supabase
      .from('cancellation_requests')
      .select('*, work_requests(*)')
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString())
      .limit(50)

    if (error) {
      console.error('Error fetching cancellation requests:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${requests?.length || 0} requests to auto-approve`)

    let approved = 0
    const errors = []
    
    for (const request of requests || []) {
      try {
        // キャンセル申請を承認
        const { error: updateError } = await supabase
          .from('cancellation_requests')
          .update({
            status: 'approved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', request.id)

        if (updateError) {
          console.error(`Error updating cancellation request ${request.id}:`, updateError)
          errors.push({ id: request.id, error: updateError.message })
          continue
        }

        // work_requestsをキャンセル済みに
        const { error: workRequestError } = await supabase
          .from('work_requests')
          .update({ status: 'cancelled' })
          .eq('id', request.work_request_id)

        if (workRequestError) {
          console.error(`Error updating work request ${request.work_request_id}:`, workRequestError)
          errors.push({ id: request.work_request_id, error: workRequestError.message })
          continue
        }

        // 返金処理（payment_intent_idがある場合のみ）
        if (request.work_requests.payment_intent_id) {
          try {
            const refundResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-refund`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                workRequestId: request.work_request_id,
                reason: 'Auto-approved after 7 days'
              })
            })

            if (!refundResponse.ok) {
              console.error(`Refund API call failed for ${request.work_request_id}`)
            } else {
              console.log(`Refund processed for ${request.work_request_id}`)
            }
          } catch (refundError) {
            console.error(`Refund error for ${request.work_request_id}:`, refundError)
            // 返金エラーでも処理は続行
          }
        }

        // 通知を送信（申請を受けた側へ）
        const recipientId = request.requester_id === request.work_requests.requester_id
          ? request.work_requests.selected_applicant_id
          : request.work_requests.requester_id

        const { error: notifError } = await supabase.from('notifications').insert({
          recipient_id: recipientId,
          type: 'cancelled',
          title: 'キャンセルが自動承認されました',
          message: `「${request.work_requests.title}」のキャンセル申請が7日間応答がなかったため、自動的に承認されました。`,
          related_request_id: request.work_request_id,
          created_at: new Date().toISOString()
        })

        if (notifError) {
          console.error(`Error creating notification:`, notifError)
        }

        // 申請者にも通知
        const { error: requesterNotifError } = await supabase.from('notifications').insert({
          recipient_id: request.requester_id,
          type: 'cancelled',
          title: 'キャンセル申請が承認されました',
          message: `「${request.work_requests.title}」のキャンセル申請が自動的に承認されました。`,
          related_request_id: request.work_request_id,
          created_at: new Date().toISOString()
        })

        if (requesterNotifError) {
          console.error(`Error creating requester notification:`, requesterNotifError)
        }

        console.log(`Successfully auto-approved cancellation request ${request.id}`)
        approved++

      } catch (err) {
        console.error(`Error processing request ${request.id}:`, err)
        errors.push({ id: request.id, error: err.message })
      }
    }

    const result = {
      success: true,
      approved,
      total: requests?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('Auto-approval completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
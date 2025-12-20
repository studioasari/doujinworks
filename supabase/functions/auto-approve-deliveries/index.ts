import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 14日前の日時を計算
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    console.log('Checking for deliveries older than:', fourteenDaysAgo.toISOString())

    // 14日以上経過したdelivered状態の依頼を取得
    // 1回のCron実行で最大50件まで処理
    const { data: requests, error } = await supabase
      .from('work_requests')
      .select('*')
      .eq('status', 'delivered')
      .lt('delivered_at', fourteenDaysAgo.toISOString())
      .limit(50)

    if (error) {
      console.error('Error fetching delivered requests:', error)
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
        // ステータスをcompletedに
        const { error: updateError } = await supabase
          .from('work_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', request.id)

        if (updateError) {
          console.error(`Error updating work request ${request.id}:`, updateError)
          errors.push({ id: request.id, error: updateError.message })
          continue
        }

        // 通知を送信（依頼者へ）
        const { error: requesterNotifError } = await supabase.from('notifications').insert({
          recipient_id: request.requester_id,
          type: 'completed',
          title: '自動検収完了',
          message: `「${request.title}」は検収期限（14日）を過ぎたため、自動的に検収完了となりました。`,
          related_request_id: request.id,
          created_at: new Date().toISOString()
        })

        if (requesterNotifError) {
          console.error(`Error creating requester notification:`, requesterNotifError)
        }

        // 通知を送信（クリエイターへ）
        const { error: creatorNotifError } = await supabase.from('notifications').insert({
          recipient_id: request.selected_applicant_id,
          type: 'completed',
          title: '自動検収完了',
          message: `「${request.title}」が自動的に検収完了となりました。報酬が確定しました。`,
          related_request_id: request.id,
          created_at: new Date().toISOString()
        })

        if (creatorNotifError) {
          console.error(`Error creating creator notification:`, creatorNotifError)
        }

        console.log(`Successfully auto-approved delivery for request ${request.id}`)
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
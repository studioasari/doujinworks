import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let warnings = 0
    const errors = []

    // ========================================
    // キャンセル申請の事前通知（4日後 = 残り3日）
    // ========================================
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    const fourDaysAgoEnd = new Date(fourDaysAgo)
    fourDaysAgoEnd.setHours(fourDaysAgo.getHours() + 1) // 1時間の幅

    console.log('Checking for cancellation requests between:', fourDaysAgo.toISOString(), 'and', fourDaysAgoEnd.toISOString())

    const { data: cancelRequests, error: cancelError } = await supabase
      .from('cancellation_requests')
      .select('*, work_requests(*)')
      .eq('status', 'pending')
      .gte('created_at', fourDaysAgo.toISOString())
      .lt('created_at', fourDaysAgoEnd.toISOString())

    if (cancelError) {
      console.error('Error fetching cancellation requests:', cancelError)
      errors.push({ type: 'cancellation_requests', error: cancelError.message })
    } else {
      console.log(`Found ${cancelRequests?.length || 0} cancellation requests for warning`)

      for (const request of cancelRequests || []) {
        try {
          // 申請を受けた側（応答する側）に通知
          const recipientId = request.requester_id === request.work_requests.requester_id
            ? request.work_requests.selected_applicant_id
            : request.work_requests.requester_id

          const { error: notifError } = await supabase.from('notifications').insert({
            recipient_id: recipientId,
            type: 'auto_approval_warning',
            title: 'キャンセル申請への応答期限が近づいています',
            message: `「${request.work_requests.title}」のキャンセル申請があります。あと3日以内に応答しない場合、自動的に承認されます。`,
            related_request_id: request.work_request_id,
            created_at: new Date().toISOString()
          })

          if (notifError) {
            console.error(`Error creating notification for cancellation ${request.id}:`, notifError)
            errors.push({ id: request.id, error: notifError.message })
          } else {
            console.log(`Sent warning notification for cancellation request ${request.id}`)
            warnings++
          }

        } catch (err) {
          console.error(`Error processing cancellation request ${request.id}:`, err)
          errors.push({ id: request.id, error: err.message })
        }
      }
    }

    // ========================================
    // 納品後の検収期限通知（11日後 = 残り3日）
    // ========================================
    const elevenDaysAgo = new Date()
    elevenDaysAgo.setDate(elevenDaysAgo.getDate() - 11)
    const elevenDaysAgoEnd = new Date(elevenDaysAgo)
    elevenDaysAgoEnd.setHours(elevenDaysAgo.getHours() + 1) // 1時間の幅

    console.log('Checking for deliveries between:', elevenDaysAgo.toISOString(), 'and', elevenDaysAgoEnd.toISOString())

    const { data: deliveryRequests, error: deliveryError } = await supabase
      .from('work_requests')
      .select('*')
      .eq('status', 'delivered')
      .gte('delivered_at', elevenDaysAgo.toISOString())
      .lt('delivered_at', elevenDaysAgoEnd.toISOString())

    if (deliveryError) {
      console.error('Error fetching delivered requests:', deliveryError)
      errors.push({ type: 'delivered_requests', error: deliveryError.message })
    } else {
      console.log(`Found ${deliveryRequests?.length || 0} deliveries for warning`)

      for (const request of deliveryRequests || []) {
        try {
          const { error: notifError } = await supabase.from('notifications').insert({
            recipient_id: request.requester_id,
            type: 'auto_approval_warning',
            title: '検収期限が近づいています',
            message: `「${request.title}」の検収期限まであと3日です。期限内に検収を行ってください。14日を過ぎると自動的に検収完了となります。`,
            related_request_id: request.id,
            created_at: new Date().toISOString()
          })

          if (notifError) {
            console.error(`Error creating notification for delivery ${request.id}:`, notifError)
            errors.push({ id: request.id, error: notifError.message })
          } else {
            console.log(`Sent warning notification for delivery ${request.id}`)
            warnings++
          }

        } catch (err) {
          console.error(`Error processing delivery ${request.id}:`, err)
          errors.push({ id: request.id, error: err.message })
        }
      }
    }

    const result = {
      success: true,
      warnings,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('Warning notifications completed:', result)

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
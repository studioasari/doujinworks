import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 通知作成ヘルパー
async function createNotification(
  profileId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      profile_id: profileId,
      type,
      title,
      message,
      link,
      is_read: false,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('通知作成エラー:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（Cron Secretで保護）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      warnings: 0,
      autoApprovals: 0,
      errors: [] as string[]
    }

    // =====================================
    // 1. 自動承認警告（検収期限3日前）
    // =====================================
    
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4) // 7日 - 3日 = 4日前の納品

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // 4日前に納品されて、まだ警告を送っていないものを取得
    const { data: warningTargets, error: warningError } = await supabase
      .from('work_deliveries')
      .select(`
        id,
        work_request_id,
        work_requests!inner (
          id,
          title,
          requester_id,
          status,
          auto_approval_warning_sent_at
        )
      `)
      .eq('status', 'pending')
      .gte('created_at', fourDaysAgo.toISOString())
      .lt('created_at', threeDaysAgo.toISOString())
      .is('work_requests.auto_approval_warning_sent_at', null)
      .eq('work_requests.status', 'delivered')

    if (warningError) {
      console.error('警告対象取得エラー:', warningError)
      results.errors.push(`警告取得失敗: ${warningError.message}`)
    } else if (warningTargets && warningTargets.length > 0) {
      for (const delivery of warningTargets) {
        const request = delivery.work_requests as any

        try {
          // 警告通知を送信
          await createNotification(
            request.requester_id,
            'auto_approval_warning',
            '【重要】検収期限が近づいています',
            `「${request.title}」の検収期限まであと3日です。期限を過ぎると自動承認されます。`,
            `/requests/${request.id}/status`
          )

          // フラグを立てる
          await supabase
            .from('work_requests')
            .update({ auto_approval_warning_sent_at: new Date().toISOString() })
            .eq('id', request.id)

          results.warnings++
        } catch (error) {
          console.error(`警告送信エラー (request: ${request.id}):`, error)
          results.errors.push(`警告送信失敗: ${request.id}`)
        }
      }
    }

    // =====================================
    // 2. 自動承認（検収期限7日経過）
    // =====================================
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 7日以上前に納品されて、まだpendingのものを取得
    const { data: approvalTargets, error: approvalError } = await supabase
      .from('work_deliveries')
      .select(`
        id,
        work_request_id,
        contractor_id,
        work_requests!inner (
          id,
          title,
          requester_id,
          status
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString())
      .eq('work_requests.status', 'delivered')

    if (approvalError) {
      console.error('自動承認対象取得エラー:', approvalError)
      results.errors.push(`自動承認取得失敗: ${approvalError.message}`)
    } else if (approvalTargets && approvalTargets.length > 0) {
      for (const delivery of approvalTargets) {
        const request = delivery.work_requests as any

        try {
          // 納品を承認
          await supabase
            .from('work_deliveries')
            .update({
              status: 'approved',
              feedback: '検収期限経過により自動承認されました'
            })
            .eq('id', delivery.id)

          // 依頼を完了
          await supabase
            .from('work_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', request.id)

          // クリエイターに通知
          await createNotification(
            delivery.contractor_id,
            'completed',
            '自動承認されました',
            `「${request.title}」が検収期限経過により承認されました。お疲れ様でした！`,
            `/requests/${request.id}/status`
          )

          // 依頼者にも通知
          await createNotification(
            request.requester_id,
            'completed',
            '自動承認が完了しました',
            `「${request.title}」が検収期限経過により自動承認されました。`,
            `/requests/${request.id}/status`
          )

          results.autoApprovals++
        } catch (error) {
          console.error(`自動承認エラー (delivery: ${delivery.id}):`, error)
          results.errors.push(`自動承認失敗: ${delivery.id}`)
        }
      }
    }

    // =====================================
    // 3. 結果を返す
    // =====================================

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        warningsSent: results.warnings,
        autoApprovalsProcessed: results.autoApprovals,
        errors: results.errors
      }
    })

  } catch (error) {
    console.error('自動承認処理エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    )
  }
}
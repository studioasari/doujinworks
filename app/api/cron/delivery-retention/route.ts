import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2DeliveriesClient } from '@/lib/r2-upload'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      read: false,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('[delivery-retention] 通知作成エラー:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = {
      warnings7d: { sent: 0, contracts: 0 },
      warnings1d: { sent: 0, contracts: 0 },
      deletions: { processed: 0, succeeded: 0, failed: 0 },
      errors: [] as string[]
    }

    // =====================================
    // 1. 7日前警告の送信
    // =====================================

    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const { data: warning7dTargets, error: warning7dError } = await supabase
      .from('delivery_files')
      .select(`
        id,
        original_filename,
        work_contract_id,
        scheduled_delete_at,
        work_contract:work_contracts!inner (
          id,
          contractor_id,
          work_request_id,
          work_request:work_requests!inner (
            id,
            title,
            requester_id
          )
        )
      `)
      .is('deleted_at', null)
      .is('warning_7d_sent_at', null)
      .gt('scheduled_delete_at', now.toISOString())
      .lte('scheduled_delete_at', sevenDaysFromNow.toISOString())
      .limit(200)

    if (warning7dError) {
      console.error('[delivery-retention] 7日前警告対象取得エラー:', warning7dError)
      results.errors.push(`7日前警告取得失敗: ${warning7dError.message}`)
    } else if (warning7dTargets && warning7dTargets.length > 0) {
      const grouped = new Map<string, typeof warning7dTargets>()
      for (const file of warning7dTargets) {
        const key = file.work_contract_id
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(file)
      }

      for (const [contractId, files] of grouped) {
        try {
          const contract = (files[0] as any).work_contract
          const workRequest = Array.isArray(contract.work_request)
            ? contract.work_request[0]
            : contract.work_request
          const requestTitle = workRequest?.title || ''
          const requesterId = workRequest?.requester_id
          const contractorId = contract.contractor_id
          const requestId = workRequest?.id || contract.work_request_id
          const link = `/requests/${requestId}/contracts/${contractId}`

          const message = `「${requestTitle}」の納品ファイル（${files.length}件）が7日後に自動削除されます。必要な場合はダウンロードしてください。`

          if (requesterId) {
            await createNotification(
              requesterId,
              'delivery_file_expiring',
              '納品ファイルが7日後に削除されます',
              message,
              link
            )
            results.warnings7d.sent++
          }

          if (contractorId) {
            await createNotification(
              contractorId,
              'delivery_file_expiring',
              '納品ファイルが7日後に削除されます',
              message,
              link
            )
            results.warnings7d.sent++
          }

          const fileIds = files.map(f => f.id)
          await supabase
            .from('delivery_files')
            .update({ warning_7d_sent_at: new Date().toISOString() })
            .in('id', fileIds)

          results.warnings7d.contracts++
        } catch (error) {
          console.error(`[delivery-retention] 7日前警告エラー (contract: ${contractId}):`, error)
          results.errors.push(`7日前警告失敗: ${contractId}`)
        }
      }
    }

    // =====================================
    // 2. 1日前警告の送信
    // =====================================

    const oneDayFromNow = new Date(now)
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)

    const { data: warning1dTargets, error: warning1dError } = await supabase
      .from('delivery_files')
      .select(`
        id,
        original_filename,
        work_contract_id,
        scheduled_delete_at,
        work_contract:work_contracts!inner (
          id,
          contractor_id,
          work_request_id,
          work_request:work_requests!inner (
            id,
            title,
            requester_id
          )
        )
      `)
      .is('deleted_at', null)
      .is('warning_1d_sent_at', null)
      .gt('scheduled_delete_at', now.toISOString())
      .lte('scheduled_delete_at', oneDayFromNow.toISOString())
      .limit(200)

    if (warning1dError) {
      console.error('[delivery-retention] 1日前警告対象取得エラー:', warning1dError)
      results.errors.push(`1日前警告取得失敗: ${warning1dError.message}`)
    } else if (warning1dTargets && warning1dTargets.length > 0) {
      const grouped = new Map<string, typeof warning1dTargets>()
      for (const file of warning1dTargets) {
        const key = file.work_contract_id
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(file)
      }

      for (const [contractId, files] of grouped) {
        try {
          const contract = (files[0] as any).work_contract
          const workRequest = Array.isArray(contract.work_request)
            ? contract.work_request[0]
            : contract.work_request
          const requestTitle = workRequest?.title || ''
          const contractorId = contract.contractor_id
          const requestId = workRequest?.id || contract.work_request_id
          const link = `/requests/${requestId}/contracts/${contractId}`

          const message = `【重要】「${requestTitle}」の納品ファイル（${files.length}件）が明日自動削除されます。必要な場合はダウンロードしてください。`

          if (contractorId) {
            await createNotification(
              contractorId,
              'delivery_file_expiring_urgent',
              '【重要】納品ファイルが明日削除されます',
              message,
              link
            )
            results.warnings1d.sent++
          }

          const fileIds = files.map(f => f.id)
          await supabase
            .from('delivery_files')
            .update({ warning_1d_sent_at: new Date().toISOString() })
            .in('id', fileIds)

          results.warnings1d.contracts++
        } catch (error) {
          console.error(`[delivery-retention] 1日前警告エラー (contract: ${contractId}):`, error)
          results.errors.push(`1日前警告失敗: ${contractId}`)
        }
      }
    }

    // =====================================
    // 3. 削除実行
    // =====================================

    const { data: deletionTargets, error: deletionError } = await supabase
      .from('delivery_files')
      .select('id, r2_key')
      .is('deleted_at', null)
      .lte('scheduled_delete_at', now.toISOString())
      .limit(200)

    if (deletionError) {
      console.error('[delivery-retention] 削除対象取得エラー:', deletionError)
      results.errors.push(`削除対象取得失敗: ${deletionError.message}`)
    } else if (deletionTargets && deletionTargets.length > 0) {
      const bucketName = process.env.R2_BUCKET_DELIVERIES
      if (!bucketName) {
        console.error('[delivery-retention] R2_BUCKET_DELIVERIES が未設定')
        results.errors.push('R2_BUCKET_DELIVERIES が未設定')
      } else {
        for (const file of deletionTargets) {
          results.deletions.processed++
          try {
            const command = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: file.r2_key,
            })
            await r2DeliveriesClient.send(command)

            const { error: updateError } = await supabase
              .from('delivery_files')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', file.id)

            if (updateError) {
              console.error(`[delivery-retention] deleted_at 更新失敗 (${file.id}):`, updateError)
              results.errors.push(`DB更新失敗: ${file.id}`)
              results.deletions.failed++
            } else {
              results.deletions.succeeded++
            }
          } catch (error) {
            console.error(`[delivery-retention] R2削除エラー (${file.id}, key: ${file.r2_key}):`, error)
            results.errors.push(`R2削除失敗: ${file.id}`)
            results.deletions.failed++
          }
        }
      }
    }

    // =====================================
    // 4. レスポンス
    // =====================================

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })

  } catch (error) {
    console.error('[delivery-retention] 予期しないエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

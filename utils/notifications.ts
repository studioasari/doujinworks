// utils/notifications.ts
import { supabase } from './supabase'

export type NotificationType =
  | 'application'
  | 'accepted'
  | 'paid'
  | 'delivered'
  | 'completed'
  | 'review'
  | 'delivery_rejected'
  | 'cancellation_request'  // キャンセル申請
  | 'cancelled'              // キャンセル完了
  | 'auto_approval_warning'  // 自動承認警告（3日前）
  | 'delivery_file_expiring'         // 納品ファイル削除予告（7日前）
  | 'delivery_file_expiring_urgent'  // 納品ファイル削除予告（1日前）

export async function createNotification(
  profileId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    const res = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, type, title, message, link }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('通知作成エラー:', data)
    }
  } catch (error) {
    console.error('通知作成エラー:', error)
  }
}

// 未読通知数を取得
export async function getUnreadCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('read', false)

  if (error) {
    console.error('未読数取得エラー:', error)
    return 0
  }

  return count || 0
}

// 通知を既読にする
export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('既読更新エラー:', error)
  }
}

// 全て既読にする
export async function markAllAsRead(profileId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false)

  if (error) {
    console.error('全既読更新エラー:', error)
  }
}
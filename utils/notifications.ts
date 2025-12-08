// utils/notifications.ts
import { supabase } from './supabase'

export type NotificationType = 'application' | 'accepted' | 'paid' | 'delivered' | 'completed' | 'review'

export async function createNotification(
  profileId: string,
  type: NotificationType,
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
      read: false
    })

  if (error) {
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
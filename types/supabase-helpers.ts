/**
 * Supabase テーブルの Row 型ヘルパー
 * database.types.ts から生成された型を使いやすくする
 */
import type { Database } from './database.types'

// テーブルの Row 型
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

// よく使うテーブルの Row 型エイリアス
export type ProfileRow = Tables<'profiles'>
export type WorkRequestRow = Tables<'work_requests'>
export type WorkContractRow = Tables<'work_contracts'>
export type WorkDeliveryRow = Tables<'work_deliveries'>
export type PaymentRow = Tables<'payments'>
export type MessageRow = Tables<'messages'>
export type ChatRoomRow = Tables<'chat_rooms'>
export type CancellationRequestRow = Tables<'cancellation_requests'>
export type DeliveryFileRow = Tables<'delivery_files'>
export type NotificationRow = Tables<'notifications'>
export type PortfolioItemRow = Tables<'portfolio_items'>
export type ReviewRow = Tables<'reviews'>

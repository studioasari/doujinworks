import { createBrowserClient } from '@supabase/ssr'

/**
 * クライアントサイド（Client Component）用のSupabaseクライアント
 * 
 * ブラウザで実行されるコンポーネントで使用します。
 * 認証状態を自動的に管理し、Cookieと連携します。
 * 
 * @example
 * ```typescript
 * 'use client'
 * 
 * import { createClient } from '@/utils/supabase/client'
 * 
 * export function MyComponent() {
 *   const supabase = createClient()
 *   
 *   const { data } = await supabase.from('profiles').select('*')
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
import 'server-only'
import { createClient } from '@supabase/supabase-js'

// 🔒 環境変数の厳密な検証
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// 🔒 クライアント環境での実行を防止
if (typeof window !== 'undefined') {
  throw new Error('Admin client cannot be used in browser environment')
}

/**
 * Service Role Key を使用した管理者権限のSupabaseクライアント
 * 
 * ⚠️ 警告：
 * - このクライアントはRLSをバイパスできます
 * - サーバーサイド（Server Actions, Route Handlers）でのみ使用
 * - 絶対にクライアントに公開しないこと
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
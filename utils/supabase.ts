import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

export const getSupabase = () => {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    console.log('🔍 Supabase URL:', supabaseUrl)
    console.log('🔍 Key exists:', !!supabaseAnonKey)
    
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabase
}

export { getSupabase as supabase }
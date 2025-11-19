import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kzpmrmamzgmdwavvgfar.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cG1ybWFtemdtZHdhdnZnZmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTkwMzAsImV4cCI6MjA3ODg3NTAzMH0.7RupNQIDtieqWNHkoOvE2WtlT0l9ZD3Kc4bZCXfarVc'

console.log('🔍 使用するSupabase URL:', supabaseUrl)
console.log('🔍 環境変数から取得:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
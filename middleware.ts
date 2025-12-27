import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // ログイン必須のページのみ指定
    '/dashboard/:path*',
    '/profile/:path*',
    '/portfolio/:path*',
    '/messages/:path*',
    '/settings/:path*',  // もしあれば
  ],
}
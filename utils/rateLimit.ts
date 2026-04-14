import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import crypto from 'crypto'

// 環境変数チェック
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing Upstash Redis configuration')
}

// Redis クライアントの初期化
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * リミッターの安全な呼び出し（フェイルオープン）
 *
 * Upstash Redisが落ちている・接続できない等のエラー時に
 * リミッター呼び出しで例外が発生するのを防ぐ。
 * エラー時は success: true を返して処理を通す（＝レート制限を一時的に無効化）。
 *
 * - Redis障害でも認証フローが500エラーで止まらない
 * - エラーは console.error に残すので監視で気付ける
 *
 * ⚠ 注意: Redis障害中はレート制限が無効になるため、
 *        ブルートフォース攻撃への耐性が一時的に下がる。
 *        本番では Upstash の監視を併用すること。
 */
export async function safeLimit(
  limiter: Ratelimit,
  key: string,
  limiterName: string
): Promise<{ success: boolean; reset: number; limit: number; remaining: number }> {
  try {
    return await limiter.limit(key)
  } catch (error) {
    console.error(
      `[rateLimit] ${limiterName} failed, failing open:`,
      error instanceof Error ? error.message : error
    )
    return {
      success: true,
      reset: Date.now(),
      limit: 0,
      remaining: 0,
    }
  }
}

/**
 * レート制限キーの生成（衝突防止）
 * IP + User-Agent のハッシュを使用
 * 
 * @param ip - IPアドレス
 * @param userAgent - User-Agent文字列（オプション）
 * @param identifier - 追加の識別子（メールアドレスなど）
 */
export function createRateLimitKey(
  ip: string,
  userAgent?: string,
  identifier?: string
): string {
  const components = [ip]
  
  if (userAgent) {
    components.push(userAgent)
  }
  
  if (identifier) {
    components.push(identifier)
  }
  
  const hash = crypto
    .createHash('sha256')
    .update(components.join(':'))
    .digest('hex')
    .substring(0, 16)
  
  return hash
}

/**
 * 残り時間を曖昧な表現に変換
 * セキュリティ改善: レート制限の詳細を隠す
 */
export function getVagueRetryTime(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60)
  
  if (minutes <= 5) return '数分'
  if (minutes <= 15) return '15分程度'
  if (minutes <= 30) return '30分程度'
  if (minutes <= 60) return '1時間程度'
  
  const hours = Math.ceil(minutes / 60)
  return `${hours}時間程度`
}

// ========================================
// 新規登録
// ========================================

// 時間制限: 3回/時間
export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: 'ratelimit:signup',
})

// 🆕 日次制限: 10回/日
export const signupDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  analytics: true,
  prefix: 'ratelimit:signup-daily',
})

// ========================================
// メール再送信
// ========================================

// 時間制限: 5回/時間（既存のまま）
export const emailResendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: 'ratelimit:email-resend',
})

// 🆕 日次制限: 15回/日
export const emailResendDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, '24 h'),
  analytics: true,
  prefix: 'ratelimit:email-resend-daily',
})

// ========================================
// ログイン
// ========================================

// ログイン失敗: 5回 → 15分ロックアウト（既存のまま）
export const loginFailureLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'ratelimit:login-failure',
})

// ========================================
// パスワードリセット
// ========================================

// 時間制限: 3回/時間（既存のまま）
export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: 'ratelimit:password-reset',
})

// 🆕 日次制限: 5回/日
export const passwordResetDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '24 h'),
  analytics: true,
  prefix: 'ratelimit:password-reset-daily',
})

// ========================================
// 通知作成
// ========================================

// 1分あたり60件（通常の操作で1アクションにつき1〜2件の通知が
// 作成されるため、連続操作を考慮しても余裕のある設定）
export const notificationCreateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:notification-create',
})

// ========================================
// ヘルパー関数
// ========================================

// IPアドレス取得ヘルパー関数（既存のまま維持）
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return 'unknown'
}
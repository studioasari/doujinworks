import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2DeliveriesClient } from '@/lib/r2-upload'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deliveryUploadLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 納品ファイルアップロード用 署名付きURL発行API
 *
 * クリエイターが契約に紐づくファイルを R2 に直接 PUT するための
 * 署名URL を発行する。実際のファイル転送はクライアント→R2 で
 * サーバーを経由しない。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. 対象 work_contract の受注者（contractor_id）本人であること
 *  3. 契約が 'paid' または 'delivered'（再納品可）であること
 *
 * 安全対策:
 *  - contractId / deliveryId を UUID 形式で厳密検証
 *  - 拡張子ホワイトリスト + MIME type + サイズ上限
 *  - ContentLength を署名に含めて R2 側で実サイズ一致を強制
 *    （クライアントが申告と異なるサイズを PUT すると R2 が弾く）
 *  - user.id ベースのレート制限（1分20件）
 *
 * R2 キー形式:
 *   deliveries/{contractId}/{deliveryId}/{uuid}.{ext}
 *   - deliveryId はクライアントが納品モーダル開始時に生成する UUID。
 *     フェーズ4 の /api/deliveries/create で work_deliveries.id として
 *     この UUID を明示指定して INSERT する。
 *   - {uuid} はファイル単位の衝突回避（日本語ファイル名サニタイズの代替）。
 *     元のファイル名は delivery_files.original_filename に保存する。
 */

// 500MB
const MAX_FILE_SIZE = 524288000

// UUID v1-v5 どの版でも通す形式チェック（厳密な version ビット検査はしない）
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 納品で許可する拡張子ホワイトリスト
const ALLOWED_EXTENSIONS = new Set([
  // 画像
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff',
  // デザイン
  'psd', 'ai', 'pdf', 'sketch', 'fig', 'xd',
  // 3D
  'blend', 'fbx', 'obj', 'glb', 'gltf',
  // 動画
  'mp4', 'mov', 'webm', 'avi', 'mkv',
  // 音声
  'mp3', 'wav', 'm4a', 'ogg', 'flac',
  // アーカイブ
  'zip', 'rar', '7z',
  // ドキュメント
  'txt', 'md', 'doc', 'docx',
])

// filename から拡張子を抽出。先頭ドット/末尾ドット/拡張子なしは null。
function extractExtension(filename: string): string | null {
  const dotIndex = filename.lastIndexOf('.')
  // 先頭ドット(".gitignore" 等)、末尾ドット("foo.")、拡張子なしは拒否
  if (dotIndex <= 0 || dotIndex === filename.length - 1) {
    return null
  }
  return filename.slice(dotIndex + 1).toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    // ステップ1: ログイン確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // ステップ2: JSON パース
    let body: {
      contractId?: unknown
      deliveryId?: unknown
      filename?: unknown
      contentType?: unknown
      fileSize?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    // ステップ3: バリデーション
    const contractId = body.contractId
    const deliveryId = body.deliveryId
    const filename = body.filename
    const contentType = body.contentType
    const fileSize = body.fileSize

    if (typeof contractId !== 'string' || !UUID_PATTERN.test(contractId)) {
      return NextResponse.json(
        { error: 'contractId が不正です' },
        { status: 400 }
      )
    }

    if (typeof deliveryId !== 'string' || !UUID_PATTERN.test(deliveryId)) {
      return NextResponse.json(
        { error: 'deliveryId が不正です' },
        { status: 400 }
      )
    }

    if (typeof filename !== 'string' || filename.length === 0 || filename.length > 255) {
      return NextResponse.json(
        { error: 'ファイル名が不正です' },
        { status: 400 }
      )
    }

    if (typeof contentType !== 'string' || contentType.length === 0) {
      return NextResponse.json(
        { error: 'Content-Type が不正です' },
        { status: 400 }
      )
    }

    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || !Number.isInteger(fileSize)) {
      return NextResponse.json(
        { error: 'ファイルサイズが不正です' },
        { status: 400 }
      )
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ファイルサイズが上限（500MB）を超えています' },
        { status: 400 }
      )
    }

    const ext = extractExtension(filename)
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'このファイル形式はアップロードできません' },
        { status: 400 }
      )
    }

    // ステップ4: profiles.id 取得（auth uid → profiles.id）
    const admin = createAdminClient()

    const { data: myProfile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !myProfile) {
      return NextResponse.json(
        { error: 'プロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // ステップ5: 契約取得 & 当事者チェック
    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select('id, contractor_id, status')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    if (contract.contractor_id !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ6: 契約ステータスチェック
    // 'paid': 初回納品可
    // 'delivered': 再納品可（差戻し後）
    // その他（contracted / completed / cancelled）は拒否
    if (contract.status !== 'paid' && contract.status !== 'delivered') {
      return NextResponse.json(
        { error: '現在この契約にはファイルをアップロードできません' },
        { status: 400 }
      )
    }

    // ステップ7: レート制限
    const { success: withinLimit } = await safeLimit(
      deliveryUploadLimiter,
      user.id,
      'deliveryUpload'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ8: R2 キー生成 + 署名付きURL 発行
    const bucketName = process.env.R2_BUCKET_DELIVERIES
    if (!bucketName) {
      console.error('[upload-delivery] R2_BUCKET_DELIVERIES が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    const fileUuid = crypto.randomUUID()
    const r2Key = `deliveries/${contractId}/${deliveryId}/${fileUuid}.${ext}`

    // ContentLength を署名に含めることで、クライアントが申告と異なる
    // サイズを PUT した場合に R2 が署名検証エラーで拒否する。
    // unhoistableHeaders で content-length をクエリストリングに
    // ホイストさせず、署名対象ヘッダに含める。
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: contentType,
      ContentLength: fileSize,
    })

    const uploadUrl = await getSignedUrl(r2DeliveriesClient, command, {
      expiresIn: 900,
      unhoistableHeaders: new Set(['content-length']),
    })

    // ステップ9: 成功レスポンス
    return NextResponse.json({
      uploadUrl,
      r2Key,
      expiresIn: 900,
    })

  } catch (error) {
    console.error('[upload-delivery] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

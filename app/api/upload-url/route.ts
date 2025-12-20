import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client, R2_BUCKET } from '@/lib/r2'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { fileName, fileType, workRequestId } = await req.json()

    if (!fileName || !fileType || !workRequestId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ユーザー認証チェック
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ファイル名を一意にする（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `deliveries/${workRequestId}/${timestamp}-${randomString}-${sanitizedFileName}`

    // 署名付きURLを生成（15分間有効）
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType
    })

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 })

    // R2の公開URLを生成
    const fileUrl = `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${key}`

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key
    })

  } catch (error: any) {
    console.error('Upload URL generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate upload URL', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
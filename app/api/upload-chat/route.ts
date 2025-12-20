import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const category = formData.get('category') as string // roomId
    const userId = formData.get('userId') as string

    if (!file || !bucket || !category || !userId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // ファイル拡張子を取得
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    
    // ファイルパス: {roomId}/{timestamp}-{random}.{ext}
    const key = `${category}/${timestamp}-${randomStr}.${fileExt}`

    // バケット名を取得
    const bucketName = process.env.R2_BUCKET_CHATS

    if (!bucketName) {
      return NextResponse.json(
        { error: 'バケット設定がありません' },
        { status: 500 }
      )
    }

    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // R2にアップロード
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    return NextResponse.json({
      success: true,
      key: key,
      bucket: bucketName,
    })
  } catch (error) {
    console.error('アップロードエラー:', error)
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

const MAX_WIDTH = 1200
const QUALITY = 80

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bucketName = process.env.R2_BUCKET_POSTS
    const publicUrl = process.env.R2_PUBLIC_URL_POSTS
    
    if (!bucketName || !publicUrl) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })
    }

    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // sharpで画像を最適化
    let optimizedBuffer: Buffer
    let finalContentType: string
    let extension: string

    try {
      const image = sharp(buffer)
      const metadata = await image.metadata()

      // 最大幅を超えていたらリサイズ
      if (metadata.width && metadata.width > MAX_WIDTH) {
        image.resize(MAX_WIDTH, null, { withoutEnlargement: true })
      }

      // WebPに変換して圧縮
      optimizedBuffer = await image
        .webp({ quality: QUALITY })
        .toBuffer()
      
      finalContentType = 'image/webp'
      extension = 'webp'
    } catch (sharpError) {
      // sharpで処理できない場合は元のままアップロード
      console.warn('Sharp processing failed, uploading original:', sharpError)
      optimizedBuffer = buffer
      finalContentType = file.type
      extension = file.name.split('.').pop() || 'jpg'
    }

    // ファイルパス生成
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const filePath = `posts/${timestamp}-${randomStr}.${extension}`

    // R2にアップロード
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: optimizedBuffer,
      ContentType: finalContentType
    })

    await r2Client.send(command)

    const fileUrl = `${publicUrl}/${filePath}`

    return NextResponse.json({
      success: true,
      fileUrl,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      savedPercent: Math.round((1 - optimizedBuffer.length / buffer.length) * 100)
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 })
  }
}
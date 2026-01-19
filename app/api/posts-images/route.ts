import { NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

// 画像一覧取得
export async function GET() {
  try {
    const bucketName = process.env.R2_BUCKET_POSTS
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'R2_BUCKET_POSTS not configured' },
        { status: 500 }
      )
    }

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'posts/'
    })

    const response = await r2Client.send(command)
    
    const publicUrl = process.env.R2_PUBLIC_URL_POSTS
    
    const images = (response.Contents || [])
      .filter(obj => obj.Key && obj.Size && obj.Size > 0)
      .map(obj => ({
        key: obj.Key,
        url: `${publicUrl}/${obj.Key}`,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString()
      }))
      .sort((a, b) => {
        // 新しい順にソート
        if (!a.lastModified || !b.lastModified) return 0
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      })

    return NextResponse.json({ images })
    
  } catch (error) {
    console.error('List images error:', error)
    return NextResponse.json(
      { error: 'Failed to list images' },
      { status: 500 }
    )
  }
}

// 画像削除
export async function DELETE(req: Request) {
  try {
    const { key } = await req.json()
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing key' },
        { status: 400 }
      )
    }

    const bucketName = process.env.R2_BUCKET_POSTS
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'R2_BUCKET_POSTS not configured' },
        { status: 500 }
      )
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    await r2Client.send(command)

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
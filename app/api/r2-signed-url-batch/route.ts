import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAMES: { [key: string]: string } = {
  chats: process.env.R2_BUCKET_CHATS!,
  portfolios: process.env.R2_BUCKET_PORTFOLIOS!,
  avatars: process.env.R2_BUCKET_AVATARS!,
}

export async function POST(request: NextRequest) {
  try {
    const { bucket, keys } = await request.json()

    if (!bucket || !keys || !Array.isArray(keys)) {
      return NextResponse.json({ error: 'bucket and keys array are required' }, { status: 400 })
    }

    const bucketName = BUCKET_NAMES[bucket]
    if (!bucketName) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    // 最大50件まで
    const limitedKeys = keys.slice(0, 50)

    // 並列で署名付きURL生成
    const results = await Promise.all(
      limitedKeys.map(async (key: string) => {
        try {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
          const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
          return { key, signedUrl }
        } catch (error) {
          console.error(`署名付きURL生成エラー (${key}):`, error)
          return { key, signedUrl: null }
        }
      })
    )

    // キーと署名付きURLのマップを作成
    const urlMap: { [key: string]: string } = {}
    results.forEach(({ key, signedUrl }) => {
      if (signedUrl) urlMap[key] = signedUrl
    })

    return NextResponse.json({ urls: urlMap })
  } catch (error) {
    console.error('一括署名付きURL生成エラー:', error)
    return NextResponse.json({ error: 'Failed to generate signed URLs' }, { status: 500 })
  }
}
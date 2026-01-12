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

export async function POST(request: NextRequest) {
  try {
    const { bucket, key, download, fileName } = await request.json()

    if (!bucket || !key) {
      return NextResponse.json(
        { error: 'バケット名とキーが必要です' },
        { status: 400 }
      )
    }

    let bucketName: string | undefined

    if (bucket === 'chats') {
      bucketName = process.env.R2_BUCKET_CHATS
    } else if (bucket === 'deliveries') {
      bucketName = process.env.R2_BUCKET_DELIVERIES
    } else if (bucket === 'portfolio') {
      bucketName = process.env.R2_BUCKET_PORTFOLIO
    } else if (bucket === 'profiles') {
      bucketName = process.env.R2_BUCKET_PROFILES
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: '無効なバケット名です' },
        { status: 400 }
      )
    }

    const commandOptions: any = {
      Bucket: bucketName,
      Key: key,
    }
    
    // ダウンロード用の場合はContent-Dispositionを付与
    if (download && fileName) {
      commandOptions.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(fileName)}"`
    }

    const command = new GetObjectCommand(commandOptions)

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })

    return NextResponse.json({
      success: true,
      signedUrl: signedUrl,
    })
  } catch (error) {
    console.error('署名付きURL生成エラー:', error)
    return NextResponse.json(
      { error: '署名付きURLの生成に失敗しました' },
      { status: 500 }
    )
  }
}
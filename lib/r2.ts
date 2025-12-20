import { S3Client } from '@aws-sdk/client-s3'

// 納品ファイル用R2クライアント
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

// 納品ファイル用のバケット名とURL
export const R2_BUCKET = process.env.R2_BUCKET_DELIVERIES!
export const R2_PUBLIC_URL = `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`
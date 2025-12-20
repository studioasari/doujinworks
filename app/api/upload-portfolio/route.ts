import { NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2PortfolioClient } from '@/lib/r2-upload'

export async function POST(req: Request) {
  try {
    const { filePath, contentType, bucket } = await req.json()
    
    if (!filePath || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // ✨ バケット名を動的に選択
    let bucketName: string | undefined
    
    switch (bucket) {
      case 'profiles':
        bucketName = process.env.R2_BUCKET_PROFILES
        break
      case 'deliveries':
        bucketName = process.env.R2_BUCKET_DELIVERIES
        break
      case 'portfolio':
      default:
        bucketName = process.env.R2_BUCKET_PORTFOLIO
        break
    }
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'R2 bucket not configured' },
        { status: 500 }
      )
    }
    
    // 署名付きURL生成（15分有効）
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      ContentType: contentType
    })
    
    const uploadUrl = await getSignedUrl(r2PortfolioClient, command, {
      expiresIn: 900 // 15分
    })
    
    // ✨ バケットごとにカスタムドメインを選択
    let publicUrl: string
    
    switch (bucket) {
      case 'profiles':
        publicUrl = process.env.R2_PUBLIC_URL_PROFILES || process.env.R2_ENDPOINT!
        break
      case 'deliveries':
        publicUrl = process.env.R2_PUBLIC_URL_DELIVERIES || process.env.R2_ENDPOINT!
        break
      case 'portfolio':
      default:
        publicUrl = process.env.R2_PUBLIC_URL_PORTFOLIO || process.env.R2_ENDPOINT!
        break
    }
    
    // ✨ カスタムドメインはバケット専用なのでバケット名不要
    const fileUrl = `${publicUrl}/${filePath}`
    
    return NextResponse.json({
      uploadUrl,
      fileUrl
    })
    
  } catch (error) {
    console.error('Upload URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
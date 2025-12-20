import { NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2PortfolioClient } from '@/lib/r2-upload'

export async function DELETE(req: Request) {
  try {
    const { filePath } = await req.json()
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing file path' },
        { status: 400 }
      )
    }
    
    const bucketName = process.env.R2_BUCKET_PORTFOLIO
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'R2 bucket not configured' },
        { status: 500 }
      )
    }
    
    // ファイル削除
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filePath
    })
    
    await r2PortfolioClient.send(command)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
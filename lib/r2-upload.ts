import { S3Client } from '@aws-sdk/client-s3'

// 作品コンテンツ用R2クライアント
export const r2PortfolioClient = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

/**
 * R2にアップロードするための署名付きURLを取得
 */
export async function getUploadUrl(
  category: 'illustration' | 'voice' | 'music' | 'video' | 'manga' | 'novel' | 'profile' | 'avatar' | 'header' | 'pricing' | 'draft',
  fileType: 'image' | 'audio' | 'video' | 'avatar' | 'header',
  fileName: string,
  contentType: string,
  userId: string,
  bucket: 'portfolio' | 'deliveries' | 'profiles' = 'profiles'
): Promise<{ uploadUrl: string; fileUrl: string }> {
  
  const timestamp = Date.now()
  const fileExt = fileName.split('.').pop()
  
  let filePath: string
  
  switch (category) {
    case 'draft':
      // 下書き: drafts/{userId}/{timestamp}.jpg
      filePath = `drafts/${userId}/${timestamp}.${fileExt}`
      break

    case 'illustration':
    case 'manga':
      filePath = `${category}/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'voice':
    case 'music':
      const subFolder = fileType === 'audio' ? 'audio' : 'thumbnails'
      filePath = `${category}/${subFolder}/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'video':
      const videoSubFolder = fileType === 'video' ? 'videos' : 'thumbnails'
      filePath = `${category}/${videoSubFolder}/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'novel':
      filePath = `novel/covers/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'pricing':
      filePath = `pricing/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'profile':
    case 'avatar':
      filePath = `avatars/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'header':
      filePath = `headers/${userId}/${timestamp}.${fileExt}`
      break
      
    default:
      throw new Error(`Unknown category: ${category}`)
  }
  
  // バケット名を決定
  let bucketParam: string
  
  if (category === 'profile' || category === 'avatar' || category === 'header') {
    bucketParam = 'profiles'
  } else if (category === 'pricing') {
    bucketParam = 'pricing'
  } else if (category === 'draft') {
    bucketParam = 'portfolio'
  } else {
    switch (bucket) {
      case 'profiles':
        bucketParam = 'profiles'
        break
      case 'deliveries':
        bucketParam = 'deliveries'
        break
      case 'portfolio':
      default:
        bucketParam = 'portfolio'
        break
    }
  }
  
  const response = await fetch('/api/upload-portfolio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filePath,
      contentType,
      bucket: bucketParam
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to get upload URL')
  }
  
  const data = await response.json()
  return {
    uploadUrl: data.uploadUrl,
    fileUrl: data.fileUrl
  }
}

/**
 * R2にファイルを直接アップロード
 */
export async function uploadToR2(file: File, uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to upload to R2')
  }
}

/**
 * R2からファイルを削除
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  const url = new URL(fileUrl)
  const pathParts = url.pathname.split('/')
  
  const bucketIndex = pathParts.findIndex(part => 
    part === 'doujinworks-portfolio' || 
    part === 'doujinworks-deliveries' ||
    part === 'doujinworks-profiles'
  )
  
  if (bucketIndex === -1) {
    throw new Error('Invalid R2 URL')
  }
  
  const filePath = pathParts.slice(bucketIndex + 1).join('/')
  
  const response = await fetch('/api/delete-portfolio', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filePath })
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete from R2')
  }
}
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
 * 
 * @param category - カテゴリ (illustration, voice, music, video, manga, novel, profile, avatar, header, pricing)
 * @param fileType - ファイルタイプ ('image' | 'audio' | 'video' | 'avatar' | 'header')
 * @param fileName - ファイル名
 * @param contentType - Content-Type
 * @param userId - ユーザーID
 * @param bucket - バケット指定 ('portfolio' | 'deliveries' | 'profiles')
 * @returns 署名付きURLと公開URL
 */
export async function getUploadUrl(
  category: 'illustration' | 'voice' | 'music' | 'video' | 'manga' | 'novel' | 'profile' | 'avatar' | 'header' | 'pricing',
  fileType: 'image' | 'audio' | 'video' | 'avatar' | 'header',
  fileName: string,
  contentType: string,
  userId: string,
  bucket: 'portfolio' | 'deliveries' | 'profiles' = 'profiles'  // デフォルトをprofilesに変更
): Promise<{ uploadUrl: string; fileUrl: string }> {
  
  // ファイルパスの生成
  const timestamp = Date.now()
  const fileExt = fileName.split('.').pop()
  
  let filePath: string
  
  // カテゴリとファイルタイプに応じてパスを決定
  switch (category) {
    case 'illustration':
    case 'manga':
      // イラスト・マンガ: illustration/{userId}/{timestamp}.jpg
      filePath = `${category}/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'voice':
    case 'music':
      // ボイス・音楽: voice/audio/{userId}/{timestamp}.mp3 または voice/thumbnails/...
      const subFolder = fileType === 'audio' ? 'audio' : 'thumbnails'
      filePath = `${category}/${subFolder}/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'video':
      // 動画: video/videos/{userId}/{timestamp}.mp4 または video/thumbnails/...
      const videoSubFolder = fileType === 'video' ? 'videos' : 'thumbnails'
      filePath = `${category}/${videoSubFolder}/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'novel':
      // 小説: novel/covers/{userId}/{timestamp}.jpg
      filePath = `novel/covers/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'pricing':
      // 料金表: pricing/{userId}/{timestamp}.jpg
      filePath = `pricing/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'profile':
    case 'avatar':
      // プロフィール・アバター: avatars/{userId}/{timestamp}.jpg
      filePath = `avatars/${userId}/${timestamp}.${fileExt}`
      break
      
    case 'header':
      // ヘッダー: headers/{userId}/{timestamp}.jpg
      filePath = `headers/${userId}/${timestamp}.${fileExt}`
      break
      
    default:
      throw new Error(`Unknown category: ${category}`)
  }
  
  // バケット名を決定
  let bucketParam: string
  
  // category が 'profile', 'avatar', 'header' の場合は自動的に profiles バケット
  if (category === 'profile' || category === 'avatar' || category === 'header') {
    bucketParam = 'profiles'
  } else if (category === 'pricing') {
    // pricing は専用バケット
    bucketParam = 'pricing'
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
  
  // 署名付きURL生成のためのAPIエンドポイントを呼び出す
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
 * 
 * @param file - アップロードするファイル
 * @param uploadUrl - 署名付きURL
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
 * 
 * @param fileUrl - 削除するファイルのURL
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  // URLからファイルパスを抽出
  const url = new URL(fileUrl)
  const pathParts = url.pathname.split('/')
  
  // バケット名の次がファイルパス
  const bucketIndex = pathParts.findIndex(part => 
    part === 'doujinworks-portfolio' || 
    part === 'doujinworks-deliveries' ||
    part === 'doujinworks-profiles'
  )
  
  if (bucketIndex === -1) {
    throw new Error('Invalid R2 URL')
  }
  
  const filePath = pathParts.slice(bucketIndex + 1).join('/')
  
  // 削除APIを呼び出す
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
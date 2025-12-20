import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'

/**
 * 画像をリサイズ・圧縮する関数
 */
export const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.9
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // アスペクト比を保ちながらリサイズ
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(resizedFile)
            } else {
              reject(new Error('画像の圧縮に失敗しました'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })
}

/**
 * アバター画像をアップロードする関数（400x400px）
 * ✨ R2対応版
 */
export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  try {
    // 画像をリサイズ（400x400px、品質90%）
    const resizedFile = await resizeImage(file, 400, 400, 0.9)

    // ✨ R2署名付きURL取得
    const { uploadUrl, fileUrl } = await getUploadUrl(
      'avatar',      // カテゴリ
      'image',       // ファイルタイプ
      resizedFile.name,
      'image/jpeg',
      userId,
      'profiles'     // ✨ バケット指定
    )

    // ✨ R2に直接アップロード
    await uploadToR2(resizedFile, uploadUrl)

    return fileUrl
  } catch (error) {
    console.error('アバターアップロードエラー:', error)
    throw error
  }
}

/**
 * ヘッダー画像をアップロードする関数（1500x500px）
 * ✨ R2対応版
 */
export const uploadHeader = async (userId: string, file: File): Promise<string> => {
  try {
    // 画像をリサイズ（1500x500px、品質85%）
    const resizedFile = await resizeImage(file, 1500, 500, 0.85)

    // ✨ R2署名付きURL取得
    const { uploadUrl, fileUrl } = await getUploadUrl(
      'header',      // カテゴリ
      'image',       // ファイルタイプ
      resizedFile.name,
      'image/jpeg',
      userId,
      'profiles'     // ✨ バケット指定
    )

    // ✨ R2に直接アップロード
    await uploadToR2(resizedFile, uploadUrl)

    return fileUrl
  } catch (error) {
    console.error('ヘッダーアップロードエラー:', error)
    throw error
  }
}

/**
 * 画像を削除する関数
 * ✨ R2対応版
 */
export const deleteImage = async (imageUrl: string | null, bucketName: 'avatars' | 'headers'): Promise<void> => {
  if (!imageUrl) return

  try {
    // R2のファイルパスを抽出
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    
    // パスの最後の2つの部分を取得（userId/filename）
    const filePath = pathParts.slice(-2).join('/')
    
    console.log(`削除対象: ${bucketName}/${filePath}`)
    
    // ✨ 注意: R2のファイル削除はバックエンドAPIが必要
    // 現時点では削除機能はスキップ（将来的にAPIエンドポイント実装）
    console.warn('R2ファイル削除はバックエンドAPIが必要です')
    
  } catch (error) {
    console.error('削除エラー:', error)
  }
}

/**
 * ファイルのバリデーション
 */
export const validateImageFile = (file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } => {
  // ファイルサイズチェック
  const maxSize = maxSizeMB * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: `ファイルサイズは${maxSizeMB}MB以下にしてください` }
  }

  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '対応している画像形式: JPG, PNG, WebP' }
  }

  return { valid: true }
}
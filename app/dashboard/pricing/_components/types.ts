export type PricingPlan = {
  id: string
  category: string
  plan_name: string
  thumbnail_url: string
  sample_images: { url: string; order: number }[]
  minimum_price: number
  description: string
  is_public: boolean
  display_order: number
  created_at: string
}

export type Draft = {
  id: string
  category: string
  plan_name: string
  minimum_price: string
  description: string
  visibility: 'public' | 'followers' | 'private'
  timestamp: number
  categoryName?: string
  categoryIcon?: string
}

export const CATEGORIES = [
  { value: 'illustration', label: 'イラスト', icon: 'fas fa-image' },
  { value: 'manga', label: 'マンガ', icon: 'fas fa-book' },
  { value: 'novel', label: '小説', icon: 'fas fa-file-alt' },
  { value: 'music', label: '音楽', icon: 'fas fa-music' },
  { value: 'voice', label: 'ボイス', icon: 'fas fa-microphone' },
  { value: 'video', label: '動画', icon: 'fas fa-video' },
  { value: 'other', label: 'その他', icon: 'fas fa-ellipsis-h' }
]

// 画像圧縮関数
export async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new window.Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'))
              return
            }
            
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })

            if (compressedFile.size > file.size) {
              resolve(file)
            } else {
              resolve(compressedFile)
            }
          },
          file.type,
          quality
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
    }
    reader.onerror = () => reject(new Error('File read failed'))
  })
}
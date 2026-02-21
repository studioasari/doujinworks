import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2PortfolioClient } from '@/lib/r2-upload'

// POST: 下書きから投稿確定（画像を本番パスにコピー）
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 下書きを取得
    const { data: draft, error: fetchError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', params.id)
      .eq('creator_id', user.id)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const bucketName = process.env.R2_BUCKET_PORTFOLIO!
    const publicUrl = process.env.R2_PUBLIC_URL_PORTFOLIO || process.env.R2_ENDPOINT!
    const publishedUrls: string[] = []

    // 画像を本番パスにコピー
    if (draft.image_urls && draft.image_urls.length > 0) {
      for (const draftUrl of draft.image_urls) {
        const oldPath = extractR2Path(draftUrl)
        const ext = oldPath.split('.').pop() || 'jpg'
        const newPath = `${draft.category}/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

        try {
          // コピー
          await r2PortfolioClient.send(new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${oldPath}`,
            Key: newPath
          }))

          publishedUrls.push(`${publicUrl}/${newPath}`)

          // 元ファイル削除
          await r2PortfolioClient.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: oldPath
          }))
        } catch (copyError) {
          console.error('R2コピーエラー:', copyError)
          // コピー失敗時は元URLをそのまま使う
          publishedUrls.push(draftUrl)
        }
      }
    }

    // 下書きを削除
    await supabase
      .from('drafts')
      .delete()
      .eq('id', params.id)
      .eq('creator_id', user.id)

    return NextResponse.json({
      publishedUrls,
      draft
    })
  } catch (error) {
    console.error('投稿確定エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractR2Path(fileUrl: string): string {
  try {
    const url = new URL(fileUrl)
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  } catch {
    return fileUrl
  }
}
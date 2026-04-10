import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2PortfolioClient } from '@/lib/r2-upload'

// PUT: 下書き更新
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const { data, error } = await supabase
      .from('drafts')
      .update({
        title: body.title || '',
        description: body.description || '',
        tags: body.tags || [],
        rating: body.rating || 'general',
        is_original: body.is_original ?? false,
        allow_comments: body.allow_comments ?? true,
        is_public: body.is_public ?? true,
        image_urls: body.image_urls || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('creator_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('下書き更新エラー:', error)
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
    }

    return NextResponse.json({ draft: data })
  } catch (error) {
    console.error('下書き更新エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 下書き削除（R2の画像も削除）
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 先に画像URLを取得
    const { data: draft } = await supabase
      .from('drafts')
      .select('image_urls')
      .eq('id', id)
      .eq('creator_id', user.id)
      .single()

    // R2から下書き画像を削除
    if (draft?.image_urls && draft.image_urls.length > 0) {
      const bucketName = process.env.R2_BUCKET_PORTFOLIO!
      for (const url of draft.image_urls) {
        try {
          await r2PortfolioClient.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: extractR2Path(url)
          }))
        } catch (e) {
          console.error('R2画像削除エラー:', e)
        }
      }
    }

    // DBから削除
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', id)
      .eq('creator_id', user.id)

    if (error) {
      console.error('下書き削除エラー:', error)
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('下書き削除エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// R2 URLからファイルパスを抽出
function extractR2Path(fileUrl: string): string {
  try {
    const url = new URL(fileUrl)
    // カスタムドメインの場合: https://portfolio.example.com/drafts/userId/file.jpg → drafts/userId/file.jpg
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  } catch {
    return fileUrl
  }
}
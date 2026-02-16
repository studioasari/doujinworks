import { Metadata } from 'next'
import TagPortfolioList from '@/app/components/TagPortfolioList'

type Props = {
  params: Promise<{ tagName: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tagName } = await params
  const decodedTagName = decodeURIComponent(tagName)

  return {
    title: `#${decodedTagName} の作品一覧 | 同人ワークス`,
    description: `「${decodedTagName}」タグが付いた作品の一覧ページです。`,
    openGraph: {
      title: `#${decodedTagName} の作品一覧`,
      description: `「${decodedTagName}」タグが付いた作品の一覧ページです。`,
    },
  }
}

export default async function TagPage({ params }: Props) {
  const { tagName } = await params
  const decodedTagName = decodeURIComponent(tagName)

  return (
    <TagPortfolioList
      tagName={decodedTagName}
      pageTitle={`#${decodedTagName}`}
      pageDescription={`「${decodedTagName}」タグが付いた作品`}
    />
  )
}
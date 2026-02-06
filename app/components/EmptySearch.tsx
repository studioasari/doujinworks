import Image from 'next/image'
import styles from './EmptySearch.module.css'

type Props = {
  query?: string
  message?: string
}

export default function EmptySearch({ query, message }: Props) {
  return (
    <div className={styles.container}>
      <Image
        src="/illustrations/empty-search.png"
        alt="見つからない"
        width={180}
        height={180}
        sizes="180px"
        className={styles.image}
      />
      <h2 className={styles.title}>
        {query ? `「${query}」に一致する結果がないよ` : '見つからなかったよ'}
      </h2>
      <p className={styles.description}>
        {message || 'キーワードを変えて検索してみてね'}
      </p>
    </div>
  )
}
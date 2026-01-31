import styles from './Skeleton.module.css'

// 作品カード
export function WorkCardSkeleton() {
  return (
    <div className={`${styles.skeleton} ${styles.workCard}`}></div>
  )
}

// 作品グリッド
export function WorkGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridWorks}`}>
      {[...Array(count)].map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  )
}

// おすすめ作品グリッド
export function FeaturedGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridFeatured}`}>
      {[...Array(count)].map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  )
}

// クリエイターカード
export function CreatorCardSkeleton() {
  return (
    <div className={styles.creatorCard}>
      <div className={`${styles.skeleton} ${styles.creatorAvatar}`}></div>
      <div className={`${styles.skeleton} ${styles.creatorName}`}></div>
      <div className={`${styles.skeleton} ${styles.creatorUsername}`}></div>
      <div className={styles.creatorStatus}></div>
      <div className={`${styles.skeleton} ${styles.creatorBio}`}></div>
    </div>
  )
}

// クリエイターグリッド
export function CreatorGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridCreators}`}>
      {[...Array(count)].map((_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  )
}

// 依頼カード
export function RequestCardSkeleton() {
  return (
    <div className={styles.requestCard}>
      <div className={`${styles.skeleton} ${styles.requestBadge}`}></div>
      <div className={`${styles.skeleton} ${styles.requestTitle}`}></div>
      <div className={`${styles.skeleton} ${styles.requestDesc}`}></div>
      <div className={`${styles.skeleton} ${styles.requestDesc}`} style={{ width: '70%' }}></div>
      <div className={styles.requestFooter}>
        <div className={`${styles.skeleton} ${styles.requestAvatar}`}></div>
        <div className={`${styles.skeleton} ${styles.requestPrice}`}></div>
      </div>
    </div>
  )
}

// 依頼グリッド
export function RequestGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridRequests}`}>
      {[...Array(count)].map((_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  )
}

// 価格カード
export function PricingCardSkeleton() {
  return (
    <div className={styles.pricingCard}>
      <div className={`${styles.skeleton} ${styles.pricingImage}`}></div>
      <div className={styles.pricingBody}>
        <div className={`${styles.skeleton} ${styles.pricingTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.pricingPrice}`}></div>
        <div className={styles.pricingCreator}>
          <div className={`${styles.skeleton} ${styles.pricingAvatar}`}></div>
          <div className={`${styles.skeleton} ${styles.pricingName}`}></div>
        </div>
      </div>
    </div>
  )
}

// 価格グリッド
export function PricingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridPricing}`}>
      {[...Array(count)].map((_, i) => (
        <PricingCardSkeleton key={i} />
      ))}
    </div>
  )
}
import styles from './Skeleton.module.css'

// ==============================
// ローディングスピナー（ダッシュボード共通）
// ==============================

export function LoadingSpinner() {
  return (
    <div className={styles.loadingSpinner}>
      <i className="fa-solid fa-spinner fa-spin"></i>
      <span>読み込み中...</span>
    </div>
  )
}

// ==============================
// 作品系
// ==============================

export function WorkCardSkeleton() {
  return (
    <div className={`${styles.skeleton} ${styles.workCard}`}></div>
  )
}

export function WorkGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridWorks}`}>
      {[...Array(count)].map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function FeaturedGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridFeatured}`}>
      {[...Array(count)].map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ==============================
// クリエイター系
// ==============================

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

export function CreatorGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridCreators}`}>
      {[...Array(count)].map((_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ==============================
// 依頼系
// ==============================

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

export function RequestGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridRequests}`}>
      {[...Array(count)].map((_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ==============================
// 価格系（公開ページ用）
// ==============================

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
        <div className={styles.pricingFooter}>
          <div className={`${styles.skeleton} ${styles.pricingRating}`}></div>
          <div className={`${styles.skeleton} ${styles.pricingStatus}`}></div>
        </div>
      </div>
    </div>
  )
}

export function PricingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridPricing}`}>
      {[...Array(count)].map((_, i) => (
        <PricingCardSkeleton key={i} />
      ))}
    </div>
  )
}
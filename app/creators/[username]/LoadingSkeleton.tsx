import Skeleton from '@/components/skeleton/Skeleton'

export default function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* プロフィールセクション */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E5E5',
          overflow: 'hidden',
          marginBottom: '40px',
          position: 'relative'
        }}>
          {/* ヘッダー画像 */}
          <Skeleton 
            width="100%" 
            height="200px" 
            rounded="0px"
          />

          {/* プロフィール情報 */}
          <div style={{
            padding: '0 40px 40px 40px',
            position: 'relative'
          }}>
            {/* アバター */}
            <div style={{
              width: '120px',
              height: '120px',
              marginTop: '-60px',
              marginBottom: '16px',
              position: 'relative'
            }}>
              <Skeleton width="120px" height="120px" rounded="50%" />
            </div>

            {/* 職業・肩書き */}
            <div style={{ marginBottom: '8px' }}>
              <Skeleton width="100px" height="14px" />
            </div>

            {/* 名前とユーザー名 */}
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <Skeleton width="180px" height="28px" />
              <Skeleton width="100px" height="16px" />
            </div>

            {/* 統計情報 */}
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '16px'
            }}>
              <Skeleton width="60px" height="16px" />
              <Skeleton width="80px" height="16px" />
              <Skeleton width="90px" height="16px" />
            </div>

            {/* 自己紹介 */}
            <div style={{ marginBottom: '16px' }}>
              <Skeleton width="100%" height="16px" />
              <div style={{ height: '8px' }} />
              <Skeleton width="90%" height="16px" />
              <div style={{ height: '8px' }} />
              <Skeleton width="80%" height="16px" />
            </div>

            {/* SNSリンク */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <Skeleton width="36px" height="36px" rounded="50%" />
              <Skeleton width="36px" height="36px" rounded="50%" />
              <Skeleton width="36px" height="36px" rounded="50%" />
              <Skeleton width="36px" height="36px" rounded="50%" />
            </div>

            {/* 依頼を送るボタン */}
            <Skeleton width="100%" height="48px" rounded="24px" />
          </div>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          <div style={{
            padding: '10px 24px',
            borderRadius: '24px',
            backgroundColor: '#1A1A1A',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            すべて
          </div>
        </div>

        {/* 作品グリッド */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px'
        }}
        className="works-grid-skeleton">
          {[...Array(12)].map((_, i) => (
            <div key={i}>
              {/* 正方形のサムネイル（paddingBottomトリックを使用） */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '100%',
                marginBottom: '14px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}>
                  <Skeleton width="100%" height="100%" rounded="12px" />
                </div>
              </div>
              {/* タイトル */}
              <Skeleton width="80%" height="16px" />
            </div>
          ))}
        </div>
      </div>

      {/* レスポンシブ対応 */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .works-grid-skeleton {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 768px) {
          .works-grid-skeleton {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .works-grid-skeleton {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
import Skeleton from '@/components/skeleton/Skeleton'

export default function LoadingSkeleton() {
  return (
    <div style={{ padding: '24px 20px' }}>
      {/* 注目作品セクション */}
      <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '16px', 
          color: '#1A1A1A'
        }}>
          <span>注目作品</span>
          <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <Skeleton width="100%" height="180px" rounded="8px" />
              <div style={{ height: '12px' }} />
              <Skeleton width="80%" height="16px" />
              <div style={{ height: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width="24px" height="24px" rounded="50%" />
                <Skeleton width="60%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新着イラストセクション */}
      <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '16px', 
          color: '#1A1A1A'
        }}>
          <span>新着イラスト</span>
          <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <Skeleton width="100%" height="180px" rounded="8px" />
              <div style={{ height: '12px' }} />
              <Skeleton width="80%" height="16px" />
              <div style={{ height: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width="24px" height="24px" rounded="50%" />
                <Skeleton width="60%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新着マンガセクション */}
      <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '16px', 
          color: '#1A1A1A'
        }}>
          <span>新着マンガ</span>
          <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <Skeleton width="100%" height="180px" rounded="8px" />
              <div style={{ height: '12px' }} />
              <Skeleton width="80%" height="16px" />
              <div style={{ height: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width="24px" height="24px" rounded="50%" />
                <Skeleton width="60%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新着小説セクション */}
      <div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '16px', 
          color: '#1A1A1A'
        }}>
          <span>新着小説</span>
          <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <Skeleton width="100%" height="180px" rounded="8px" />
              <div style={{ height: '12px' }} />
              <Skeleton width="80%" height="16px" />
              <div style={{ height: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width="24px" height="24px" rounded="50%" />
                <Skeleton width="60%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
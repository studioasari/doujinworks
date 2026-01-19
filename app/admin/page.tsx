'use client'

export default function AdminDashboard() {
  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <h1>ダッシュボード</h1>
        <p>サイト全体の概要</p>
      </div>

      {/* 統計カード */}
      <div className="admin-stats-grid">
        <StatCard
          icon="fa-users"
          label="総ユーザー数"
          value="-"
          color="blue"
        />
        <StatCard
          icon="fa-palette"
          label="総作品数"
          value="-"
          color="green"
        />
        <StatCard
          icon="fa-file-contract"
          label="総依頼数"
          value="-"
          color="purple"
        />
        <StatCard
          icon="fa-flag"
          label="未対応の通報"
          value="-"
          color="red"
        />
      </div>

      {/* 追加の情報エリア */}
      <div className="admin-panels-grid">
        <div className="admin-panel">
          <h2>
            <i className="fas fa-clock"></i>
            最近の登録ユーザー
          </h2>
          <p className="admin-panel-placeholder">後で実装</p>
        </div>

        <div className="admin-panel">
          <h2>
            <i className="fas fa-yen-sign"></i>
            未振込の依頼
          </h2>
          <p className="admin-panel-placeholder">後で実装</p>
        </div>
      </div>
    </div>
  )
}

// 統計カードコンポーネント
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: string | number
  color: 'blue' | 'green' | 'purple' | 'red'
}) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-card-inner">
        <div className={`admin-stat-icon ${color}`}>
          <i className={`fas ${icon}`}></i>
        </div>
        <div>
          <p className="admin-stat-label">{label}</p>
          <p className="admin-stat-value">{value}</p>
        </div>
      </div>
    </div>
  )
}
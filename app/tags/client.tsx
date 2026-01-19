'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

type TagInfo = {
  name: string
  count: number
}

const CATEGORIES = [
  { value: '', label: 'すべて' },
  { value: 'illustration', label: 'イラスト' },
  { value: 'manga', label: 'マンガ' },
  { value: 'novel', label: '小説' },
  { value: 'music', label: '音楽' },
  { value: 'voice', label: 'ボイス' },
  { value: 'video', label: '動画' }
]

export default function TagListClient() {
  const [allTags, setAllTags] = useState<TagInfo[]>([])
  const [filteredTags, setFilteredTags] = useState<TagInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const tagsPerPage = 100

  useEffect(() => {
    fetchTags()
  }, [categoryFilter])

  useEffect(() => {
    filterTags()
    setCurrentPage(1)
  }, [allTags, searchQuery])

  async function fetchTags() {
    setLoading(true)
    
    try {
      let query = supabase
        .from('portfolio_items')
        .select('tags')
        .eq('is_public', true)

      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      const { data: items, error } = await query

      if (error || !items?.length) {
        setAllTags([])
        setFilteredTags([])
        setLoading(false)
        return
      }

      // タグを集計
      const tagCount = new Map<string, number>()
      
      items.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
          })
        }
      })

      // 配列に変換してソート（作品数順）
      const tagsArray: TagInfo[] = Array.from(tagCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      setAllTags(tagsArray)
    } catch (error) {
      console.error('タグ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterTags() {
    if (!searchQuery.trim()) {
      setFilteredTags(allTags)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = allTags.filter(tag => 
      tag.name.toLowerCase().includes(query)
    )
    setFilteredTags(filtered)
  }

  function Pagination() {
    const totalPages = Math.ceil(filteredTags.length / tagsPerPage)
    if (totalPages <= 1) return null

    const pages = []
    let startPage = Math.max(1, currentPage - 2)
    let endPage = Math.min(totalPages, startPage + 4)
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)

    if (startPage > 1) {
      pages.push(<button key={1} onClick={() => setCurrentPage(1)} className="pagination-btn">1</button>)
      if (startPage > 2) pages.push(<span key="start-dots" className="pagination-dots">...</span>)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button key={i} onClick={() => setCurrentPage(i)} className={`pagination-btn ${currentPage === i ? 'active' : ''}`}>
          {i}
        </button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<span key="end-dots" className="pagination-dots">...</span>)
      pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="pagination-btn">{totalPages}</button>)
    }

    return (
      <div className="list-pagination">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn">
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages}
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    )
  }

  const paginatedTags = filteredTags.slice(
    (currentPage - 1) * tagsPerPage,
    currentPage * tagsPerPage
  )

  return (
    <div className="list-page">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <main className="list-page-main">
        {/* サイドバー */}
        <aside className="list-sidebar">
          <nav className="mb-16">
            <Link href="/portfolio" className="sidebar-nav-item">
              作品一覧
            </Link>
          </nav>
          <div className="sidebar-separator"></div>
          <div>
            <div className="sidebar-section-title">カテゴリで絞り込み</div>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`sidebar-nav-item ${categoryFilter === cat.value ? 'active' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div className="list-content">
          <div className="list-content-inner">
            <div className="list-page-header">
              <h1>タグ一覧</h1>
              <p>作品に付けられたタグから探す</p>
            </div>

            <div className="list-filter-bar">
              <div className="tag-search-wrapper">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="タグを検索..."
                  className="tag-search-input"
                />
              </div>
              <span className="results-count">{filteredTags.length}件のタグ</span>
            </div>

            {loading ? (
              <div className="list-empty">
                <i className="fas fa-spinner fa-spin"></i>
                <p>読み込み中...</p>
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="list-empty">
                <i className="fas fa-tag"></i>
                <p>タグが見つかりません</p>
                {searchQuery && (
                  <p className="sub">検索条件を変更してください</p>
                )}
              </div>
            ) : (
              <>
                <div className="tag-list-grid">
                  {paginatedTags.map((tag) => (
                    <Link
                      key={tag.name}
                      href={categoryFilter 
                        ? `/tags/${encodeURIComponent(tag.name)}?category=${categoryFilter}`
                        : `/tags/${encodeURIComponent(tag.name)}`
                      }
                      className="tag-list-item"
                    >
                      <span className="tag-list-name">
                        <span className="tag-hash">#</span>
                        {tag.name}
                      </span>
                      <span className="tag-list-count">{tag.count}件</span>
                    </Link>
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .tag-search-wrapper {
          position: relative;
          flex: 1;
          max-width: 300px;
        }
        .tag-search-wrapper i {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #888888;
          font-size: 14px;
        }
        .tag-search-input {
          width: 100%;
          height: 37px;
          padding: 0 14px 0 40px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          color: #222222;
          background: #E8ECEF;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }
        .tag-search-input:focus {
          outline: none;
        }
        .tag-search-input::placeholder {
          color: #888888;
        }
        .tag-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          padding: 24px;
        }
        .tag-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #FFFFFF;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .tag-list-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .tag-list-name {
          font-size: 14px;
          font-weight: 500;
          color: #222222;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tag-hash {
          color: #5B7C99;
          margin-right: 2px;
        }
        .tag-list-count {
          font-size: 12px;
          color: #888888;
          flex-shrink: 0;
          margin-left: 8px;
        }
        @media (max-width: 768px) {
          .tag-search-wrapper {
            max-width: 100%;
          }
          .tag-list-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 8px;
            padding: 16px;
          }
          .tag-list-item {
            padding: 10px 12px;
          }
          .tag-list-name {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}
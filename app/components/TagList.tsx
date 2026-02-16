'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from '@/app/components/TagList.module.css'

type TagInfo = {
  name: string
  count: number
}

export default function TagList() {
  const [allTags, setAllTags] = useState<TagInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const tagsPerPage = 100

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  async function fetchTags() {
    setLoading(true)

    try {
      const { data: items, error } = await supabase
        .from('portfolio_items')
        .select('tags')
        .eq('is_public', true)

      if (error || !items?.length) {
        setAllTags([])
        setLoading(false)
        return
      }

      const tagCount = new Map<string, number>()

      items.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
          })
        }
      })

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

  // 検索フィルター
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags
    const query = searchQuery.toLowerCase()
    return allTags.filter(tag => tag.name.toLowerCase().includes(query))
  }, [allTags, searchQuery])

  // ページ分割
  const paginatedTags = useMemo(() => {
    return filteredTags.slice((currentPage - 1) * tagsPerPage, currentPage * tagsPerPage)
  }, [filteredTags, currentPage])

  function Pagination() {
    const totalPages = Math.ceil(filteredTags.length / tagsPerPage)
    if (totalPages <= 1) return null

    const pages = []
    let startPage = Math.max(1, currentPage - 2)
    let endPage = Math.min(totalPages, startPage + 4)
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)

    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => setCurrentPage(1)} className={styles.pageBtn}>1</button>
      )
      if (startPage > 2) pages.push(<span key="start-dots" className={styles.pageDots}>...</span>)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`${styles.pageBtn} ${currentPage === i ? styles.active : ''}`}
        >
          {i}
        </button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<span key="end-dots" className={styles.pageDots}>...</span>)
      pages.push(
        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={styles.pageBtn}>
          {totalPages}
        </button>
      )
    }

    return (
      <div className={styles.pagination}>
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={styles.pageBtn}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className={styles.pageBtn}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>タグ一覧</h1>
              <p className={styles.pageDescription}>作品に付けられたタグから探す</p>
            </div>
            <div className={styles.tagGridSkeleton}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className={styles.tagCardSkeleton}></div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.mainInner}>
          {/* ページヘッダー */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              タグ一覧
              <span className={styles.pageCount}>{filteredTags.length}件</span>
            </h1>
            <p className={styles.pageDescription}>作品に付けられたタグから探す</p>
          </div>

          {/* 検索バー */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrapper}>
              <i className={`fas fa-magnifying-glass ${styles.searchIcon}`}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タグを検索..."
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* 空状態 */}
          {allTags.length === 0 && (
            <div className={styles.emptyState}>
              <i className="fas fa-tag"></i>
              <p>タグが見つかりません</p>
            </div>
          )}

          {/* コンテンツ */}
          {allTags.length > 0 && (
            <>
              {/* 検索結果が空 */}
              {filteredTags.length === 0 && searchQuery && (
                <div className={styles.emptyState}>
                  <i className="fas fa-search"></i>
                  <p>検索条件に一致するタグがありません</p>
                </div>
              )}

              {/* タググリッド */}
              {filteredTags.length > 0 && (
                <>
                  <div className={styles.tagGrid}>
                    {paginatedTags.map((tag) => (
                      <Link
                        key={tag.name}
                        href={`/tags/${encodeURIComponent(tag.name)}`}
                        className={styles.tagCard}
                      >
                        <span className={styles.tagName}>
                          <span className={styles.tagHash}>#</span>
                          {tag.name}
                        </span>
                        <span className={styles.tagCount}>{tag.count}件</span>
                      </Link>
                    ))}
                  </div>
                  <Pagination />
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
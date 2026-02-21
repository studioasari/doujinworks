'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Draft } from '@/app/hooks/useDraft'
import styles from './DraftModal.module.css'

type DraftModalProps = {
  drafts: Draft[]
  categoryKey: string
  onLoadDraft: (draft: Draft) => void
  onDeleteDraft: (draft: Draft) => void
  getCategoryUrl: (draft: Draft) => string | null
}

export default function DraftModal({
  drafts,
  categoryKey,
  onLoadDraft,
  onDeleteDraft,
  getCategoryUrl
}: DraftModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const router = useRouter()

  // モーダル表示時のスクロール禁止
  useEffect(() => {
    if (showModal) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1)
      }
    }
    return () => {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1)
      }
    }
  }, [showModal])

  function handleLoadDraft(draft: Draft) {
    const url = getCategoryUrl(draft)
    if (url) {
      router.push(`${url}?draft=${draft.id}`)
      setShowModal(false)
      return
    }
    onLoadDraft(draft)
    setShowModal(false)
  }

  function handleDeleteDraft(draft: Draft) {
    setOpenMenu(null)
    if (confirm('この下書きを削除しますか？')) {
      onDeleteDraft(draft)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setShowModal(true)}
      >
        <i className="fa-solid fa-folder-open"></i>
        {drafts.length > 0 && (
          <span className={styles.fabCount}>{drafts.length}</span>
        )}
      </button>

      {/* モーダル */}
      {showModal && (
        <div className="modal-overlay active" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fa-solid fa-folder-open" style={{ marginRight: 'var(--space-2)' }}></i>
                保存済みの下書き ({drafts.length}件)
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">
              {drafts.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-file-lines"></i>
                  <p>保存された下書きはありません</p>
                </div>
              ) : (
                <div className={styles.list}>
                  {drafts.map((draft) => {
                    const menuKey = draft.id
                    return (
                      <div key={menuKey} className={styles.item}>
                        {/* サムネイル */}
                        {draft.image_urls && draft.image_urls.length > 0 && (
                          <div className={styles.thumb} onClick={() => handleLoadDraft(draft)}>
                            <img src={draft.image_urls[0]} alt="" />
                          </div>
                        )}
                        <div className={styles.content} onClick={() => handleLoadDraft(draft)}>
                          <div className={styles.badges}>
                            {draft.categoryName && (
                              <span className={styles.categoryBadge}>
                                <i className={draft.categoryIcon}></i> {draft.categoryName}
                              </span>
                            )}
                          </div>
                          <h4 className={styles.title}>{draft.title || '（タイトルなし）'}</h4>
                          <p className={styles.date}>
                            {new Date(draft.updated_at).toLocaleString('ja-JP')}
                          </p>
                          {draft.tags && draft.tags.length > 0 && (
                            <div className={styles.tags}>
                              {draft.tags.slice(0, 5).map((tag, i) => (
                                <span key={i}>#{tag}</span>
                              ))}
                              {draft.tags.length > 5 && (
                                <span className={styles.more}>+{draft.tags.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`${styles.menu} ${openMenu === menuKey ? styles.open : ''}`}>
                          <button
                            type="button"
                            className={styles.menuBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenu(openMenu === menuKey ? null : menuKey)
                            }}
                          >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                          </button>
                          {openMenu === menuKey && (
                            <>
                              <div className={styles.menuOverlay} onClick={() => setOpenMenu(null)} />
                              <div className={styles.menuDropdown}>
                                <button
                                  type="button"
                                  className={styles.menuDelete}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteDraft(draft)
                                  }}
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                  削除
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
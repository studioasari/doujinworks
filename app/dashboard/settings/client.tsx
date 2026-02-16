'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

type ModalType = 'email' | 'password' | 'delete' | null

// パスワード入力フィールドコンポーネント（コンポーネント外に定義）
function PasswordInput({
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  autoFocus,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  show: boolean
  onToggle: () => void
  autoFocus?: boolean
}) {
  return (
    <div className={styles.passwordWrapper}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="form-input"
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className={styles.passwordToggle}
        onClick={onToggle}
        tabIndex={-1}
        aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
      >
        <i className={`fa-solid ${show ? 'fa-eye' : 'fa-eye-slash'}`}></i>
      </button>
    </div>
  )
}

export default function SettingsClient() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // 現在のモーダル
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  // メールアドレス
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [profileId, setProfileId] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  // パスワード
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 通知設定
  const [notifyMessages, setNotifyMessages] = useState(true)
  const [notifyRequests, setNotifyRequests] = useState(true)
  const [notifyLikes, setNotifyLikes] = useState(true)
  const [notifyComments, setNotifyComments] = useState(true)

  // テーマ
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // アカウント削除
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [pendingBalance, setPendingBalance] = useState(0)
  const [activeContracts, setActiveContracts] = useState(0)
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false)

  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  // モーダル開閉時のbodyスクロール制御
  useEffect(() => {
    if (activeModal) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [activeModal])

  // Escキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        if (activeModal === 'delete' && deleting) return
        if (activeModal === 'email' && emailSaving) return
        if (activeModal === 'password' && passwordSaving) return
        closeModal()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeModal, deleting, emailSaving, passwordSaving])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUser(user)
    setEmail(user.email || '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setProfileId(profile.id)
      setUsername(profile.username || '')
    }

    // 通知設定（カラムが未追加の場合はスキップ）
    try {
      const { data: notifyProfile, error } = await supabase
        .from('profiles')
        .select('notify_messages, notify_requests, notify_likes, notify_comments')
        .eq('user_id', user.id)
        .single()

      if (!error && notifyProfile) {
        setNotifyMessages(notifyProfile.notify_messages ?? true)
        setNotifyRequests(notifyProfile.notify_requests ?? true)
        setNotifyLikes(notifyProfile.notify_likes ?? true)
        setNotifyComments(notifyProfile.notify_comments ?? true)
      }
    } catch {
      // カラムが存在しない場合はデフォルト値のまま
    }

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      setTheme(document.body.dataset.theme === 'dark' ? 'dark' : 'light')
    }

    setLoading(false)
  }

  // モーダル共通
  const openModal = (type: ModalType) => {
    setActiveModal(type)
    if (type === 'email') { setNewEmail(''); setEmailError(''); setEmailSent(false) }
    if (type === 'password') {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false)
      setPasswordError('')
    }
    if (type === 'delete') {
      setDeleteInput(''); setDeleteConfirmed(false); setDeleteError('')
      fetchDeletePrecheck()
    }
  }

  // 削除前チェック：進行中の契約＋未振込売上
  const fetchDeletePrecheck = async () => {
    if (!user || !profileId) return
    setDeleteCheckLoading(true)

    // 進行中の契約（受注側）
    const { data: contractsAsContractor } = await supabase
      .from('work_contracts')
      .select('id')
      .eq('contractor_id', profileId)
      .eq('status', 'contracted')

    // 進行中の契約（発注側：自分のwork_requestsに紐づく契約）
    const { data: myRequests } = await supabase
      .from('work_requests')
      .select('id')
      .eq('requester_id', profileId)

    let contractsAsRequester: any[] = []
    if (myRequests && myRequests.length > 0) {
      const requestIds = myRequests.map((r: any) => r.id)
      const { data } = await supabase
        .from('work_contracts')
        .select('id')
        .in('work_request_id', requestIds)
        .eq('status', 'contracted')
      contractsAsRequester = data || []
    }

    setActiveContracts(
      (contractsAsContractor?.length || 0) + contractsAsRequester.length
    )

    // 未振込売上
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('creator_id', profileId)
      .eq('status', 'pending')

    if (pendingPayments) {
      const total = pendingPayments.reduce((sum: number, row: any) => sum + (row.amount || 0), 0)
      setPendingBalance(total)
    } else {
      setPendingBalance(0)
    }

    setDeleteCheckLoading(false)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal()
  }

  // メールアドレス変更
  const handleEmailChange = async () => {
    if (!newEmail || newEmail === email) return

    setEmailSaving(true)
    setEmailError('')

    const { error } = await supabase.auth.updateUser({ email: newEmail })

    if (error) {
      setEmailError(error.message)
      setEmailSaving(false)
      return
    }

    setEmailSent(true)
    setEmailSaving(false)
  }

  // パスワード変更
  const handlePasswordChange = async () => {
    setPasswordError('')

    if (!currentPassword) {
      setPasswordError('現在のパスワードを入力してください')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上で入力してください')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません')
      return
    }

    setPasswordSaving(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordError('現在のパスワードが正しくありません')
      setPasswordSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
      setPasswordSaving(false)
      return
    }

    setPasswordSuccess('パスワードを変更しました')
    setPasswordSaving(false)
    closeModal()
    setTimeout(() => setPasswordSuccess(''), 3000)
  }

  // 通知設定の即時保存
  const updateNotifySetting = async (field: string, value: boolean) => {
    if (!user) return
    await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('user_id', user.id)
  }

  const toggleNotify = (field: string, current: boolean, setter: (val: boolean) => void) => {
    const newVal = !current
    setter(newVal)
    updateNotifySetting(field, newVal)
  }

  // テーマ切り替え
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    document.body.dataset.theme = newTheme
    localStorage.setItem('theme', newTheme)
  }

  // アカウント削除（ソフトデリート）
  const handleDeleteAccount = async () => {
    if (deleteInput !== '削除する') return

    setDeleting(true)
    setDeleteError('')

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)

      if (profileError) {
        setDeleteError('アカウントの削除に失敗しました')
        setDeleting(false)
        return
      }

      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      setDeleteError('予期しないエラーが発生しました')
      setDeleting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className={styles.container}>

      {/* ログイン情報 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ログイン情報</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>メールアドレス</span>
              <span className={styles.fieldValue}>{email}</span>
            </div>
            <button onClick={() => openModal('email')} className="btn btn-ghost btn-sm">
              変更
            </button>
          </div>

          <div className={styles.fieldDivider}></div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>パスワード</span>
              <span className={styles.fieldValue}>••••••••</span>
            </div>
            <button onClick={() => openModal('password')} className="btn btn-ghost btn-sm">
              変更
            </button>
          </div>

          {passwordSuccess && (
            <div className="alert alert-success">
              <i className="fa-solid fa-circle-check alert-icon"></i>
              {passwordSuccess}
            </div>
          )}
        </div>
      </section>

      {/* 通知設定 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>通知設定</h2>
          <p className={styles.sectionDesc}>メール通知の受信設定を変更できます</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>メッセージ通知</span>
              <span className={styles.toggleDesc}>新しいメッセージを受信したとき</span>
            </div>
            <div
              className={`toggle ${notifyMessages ? 'active' : ''}`}
              onClick={() => toggleNotify('notify_messages', notifyMessages, setNotifyMessages)}
            ></div>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>依頼通知</span>
              <span className={styles.toggleDesc}>依頼に関する更新があったとき</span>
            </div>
            <div
              className={`toggle ${notifyRequests ? 'active' : ''}`}
              onClick={() => toggleNotify('notify_requests', notifyRequests, setNotifyRequests)}
            ></div>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>いいね通知</span>
              <span className={styles.toggleDesc}>作品にいいねされたとき</span>
            </div>
            <div
              className={`toggle ${notifyLikes ? 'active' : ''}`}
              onClick={() => toggleNotify('notify_likes', notifyLikes, setNotifyLikes)}
            ></div>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>コメント通知</span>
              <span className={styles.toggleDesc}>作品にコメントされたとき</span>
            </div>
            <div
              className={`toggle ${notifyComments ? 'active' : ''}`}
              onClick={() => toggleNotify('notify_comments', notifyComments, setNotifyComments)}
            ></div>
          </div>
        </div>
      </section>

      {/* テーマ設定 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>テーマ設定</h2>
          <p className={styles.sectionDesc}>画面の表示モードを切り替えます</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.themeOptions}>
            <button
              onClick={() => handleThemeChange('light')}
              className={`${styles.themeCard} ${theme === 'light' ? styles.active : ''}`}
            >
              <div className={styles.themePreview}>
                <div className={styles.previewHeader}></div>
                <div className={styles.previewBody}>
                  <div className={styles.previewLine}></div>
                  <div className={styles.previewLineShort}></div>
                </div>
              </div>
              <div className={styles.themeLabel}>
                <i className="fa-solid fa-sun"></i>
                <span>ライト</span>
              </div>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`${styles.themeCard} ${theme === 'dark' ? styles.active : ''}`}
            >
              <div className={`${styles.themePreview} ${styles.dark}`}>
                <div className={styles.previewHeader}></div>
                <div className={styles.previewBody}>
                  <div className={styles.previewLine}></div>
                  <div className={styles.previewLineShort}></div>
                </div>
              </div>
              <div className={styles.themeLabel}>
                <i className="fa-solid fa-moon"></i>
                <span>ダーク</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* アカウント削除 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>アカウント削除</h2>
          <p className={styles.sectionDesc}>
            アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
          </p>
        </div>
        <div className={styles.sectionBody}>
          <button onClick={() => openModal('delete')} className={`btn ${styles.dangerBtn}`}>
            <i className="fa-solid fa-trash-can"></i>
            アカウントを削除する
          </button>
        </div>
      </section>

      {/* ===== モーダル群 ===== */}

      {/* メールアドレス変更モーダル */}
      <div
        className={`modal-overlay ${activeModal === 'email' ? 'active' : ''}`}
        onClick={handleOverlayClick}
      >
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">メールアドレスの変更</h3>
            <button className="modal-close" onClick={closeModal}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {emailSent ? (
            <>
              <div className="modal-body">
                <div className="alert alert-success">
                  <i className="fa-solid fa-circle-check alert-icon"></i>
                  {newEmail || '新しいアドレス'} に確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={closeModal} style={{ width: '100%' }}>
                  閉じる
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">現在のメールアドレス</label>
                  <div className={styles.readonlyField}>{email}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">新しいメールアドレス</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="form-input"
                    placeholder="新しいメールアドレスを入力"
                    autoFocus
                  />
                </div>
                {emailError && (
                  <p className="form-error">
                    <i className="fa-solid fa-circle-exclamation"></i> {emailError}
                  </p>
                )}
              </div>
              <div className="modal-footer button-group-equal">
                <button className="btn btn-secondary" onClick={closeModal} disabled={emailSaving}>
                  キャンセル
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleEmailChange}
                  disabled={emailSaving || !newEmail || newEmail === email}
                >
                  {emailSaving ? '送信中...' : '確認メールを送信'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* パスワード変更モーダル */}
      <div
        className={`modal-overlay ${activeModal === 'password' ? 'active' : ''}`}
        onClick={handleOverlayClick}
      >
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">パスワードの変更</h3>
            <button className="modal-close" onClick={closeModal}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">現在のパスワード</label>
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワードを入力"
                show={showCurrentPassword}
                onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                新しいパスワード
                <span className={styles.labelHint}>（8文字以上、小文字・数字を含む）</span>
              </label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワードを入力"
                show={showNewPassword}
                onToggle={() => setShowNewPassword(!showNewPassword)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">新しいパスワード（確認）</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>
            {passwordError && (
              <p className="form-error">
                <i className="fa-solid fa-circle-exclamation"></i> {passwordError}
              </p>
            )}
          </div>
          <div className="modal-footer button-group-equal">
            <button className="btn btn-secondary" onClick={closeModal} disabled={passwordSaving}>
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePasswordChange}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordSaving ? '変更中...' : 'パスワードを変更'}
            </button>
          </div>
        </div>
      </div>

      {/* アカウント削除モーダル */}
      <div
        className={`modal-overlay ${activeModal === 'delete' ? 'active' : ''}`}
        onClick={handleOverlayClick}
      >
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">アカウントの削除</h3>
            <button className="modal-close" onClick={closeModal}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="modal-body">
            {deleteCheckLoading ? (
              <div className={styles.deleteLoading}>
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <p className={styles.deleteDesc}>
                  以下のアカウントを削除しますか？　この操作は元に戻せません。
                </p>

                <div className={styles.deleteTarget}>
                  <span className={styles.deleteTargetLabel}>削除するアカウント</span>
                  <span className={styles.deleteTargetValue}>@{username}</span>
                </div>

                {activeContracts > 0 && (
                  <div className={styles.deleteError}>
                    <div className={styles.deleteWarningItem} style={{ alignItems: 'center' }}>
                      <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--status-error)' }}></i>
                      <strong>削除できません</strong>
                    </div>
                    <p className={styles.deleteErrorText}>
                      現在、進行中の契約が <strong>{activeContracts}件</strong> あります。すべての契約が完了するまでアカウントを削除することはできません。
                    </p>
                  </div>
                )}

                <div className={styles.deleteWarning}>
                  <div className={styles.deleteWarningItem}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--status-warning)' }}></i>
                    <strong>注意事項</strong>
                  </div>
                  <div className={styles.deleteWarningItem}>
                    <span className={styles.bullet}>•</span>
                    <span>アップロードした作品、ポートフォリオが全て削除されます。</span>
                  </div>
                  <div className={styles.deleteWarningItem}>
                    <span className={styles.bullet}>•</span>
                    <span>依頼履歴、メッセージが全て削除されます。</span>
                  </div>
                  {pendingBalance > 0 && (
                    <div className={styles.deleteWarningItem}>
                      <span className={styles.bullet}>•</span>
                      <span>
                        未振込の売上が <strong>{pendingBalance.toLocaleString()}円</strong> 残っています。売上は前月末締め・翌月20日に振り込まれますが、アカウントを削除すると受け取れなくなります。{pendingBalance < 1000 && '（※ 最低振込額1,000円未満のため繰り越し中）'}
                      </span>
                    </div>
                  )}
                  <div className={styles.deleteWarningItem}>
                    <span className={styles.bullet}>•</span>
                    <span>プロフィール、アカウント情報が全て削除されます。</span>
                  </div>
                </div>

                {activeContracts === 0 && (
                  <>
                    <div className={styles.deleteCheckboxRow}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={deleteConfirmed}
                          onChange={(e) => setDeleteConfirmed(e.target.checked)}
                        />
                        <span className="checkbox-mark"></span>
                        注意事項を確認しました。
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        確認のため「削除する」と入力してください
                      </label>
                      <input
                        type="text"
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        className="form-input"
                        placeholder="削除する"
                      />
                    </div>
                    {deleteError && (
                      <p className="form-error">
                        <i className="fa-solid fa-circle-exclamation"></i> {deleteError}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <div className="modal-footer button-group-equal">
            <button className="btn btn-secondary" onClick={closeModal} disabled={deleting}>
              {activeContracts > 0 ? '閉じる' : 'キャンセル'}
            </button>
            {activeContracts === 0 && !deleteCheckLoading && (
              <button
                className={`btn ${styles.dangerBtn}`}
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteConfirmed || deleteInput !== '削除する'}
              >
                {deleting ? '削除中...' : 'アカウントの削除'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
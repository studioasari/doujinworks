'use client'

import { useState, useCallback, useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'

interface TutorialModalProps {
  isOpen: boolean
  onComplete: () => void
}

const tutorialSteps = [
  {
    image: '/illustrations/tutorial-1.png',
    title: '登録ありがとう！',
    description: '同人ワークスは絵師さん、声優さん、作曲家さん…\nいろんなクリエイターが集まる場所だよ',
  },
  {
    image: '/illustrations/tutorial-2.png',
    title: 'まずはプロフィールを作ってみてね',
    description: 'アイコンや自己紹介があると\n依頼する側も安心して頼みやすいよ◎',
  },
  {
    image: '/illustrations/tutorial-3.png',
    title: '作品があったら載せてみよう',
    description: 'ポートフォリオを見て\n「この人にお願いしたい！」って依頼が来るかも',
  },
  {
    image: '/illustrations/tutorial-4.png',
    title: '誰かに頼みたい時もここで探せるよ',
    description: 'イラスト、ボイス、BGM…\n一緒に作る仲間が見つかる！',
  },
  {
    image: '/illustrations/tutorial-5.png',
    title: '準備できた？さっそく始めよう！',
    description: '',
  },
]

export default function TutorialModal({ isOpen, onComplete }: TutorialModalProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false })
  const [currentIndex, setCurrentIndex] = useState(0)

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index)
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCurrentIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const handlePrev = () => {
    if (emblaApi) emblaApi.scrollPrev()
  }

  const handleNext = () => {
    if (currentIndex === tutorialSteps.length - 1) {
      onComplete()
    } else if (emblaApi) {
      emblaApi.scrollNext()
    }
  }

  if (!isOpen) return null

  const isLastStep = currentIndex === tutorialSteps.length - 1
  const isFirstStep = currentIndex === 0

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 400,
      padding: 'var(--space-4)',
    }}>
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '400px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* スキップボタン */}
        <button
          onClick={onComplete}
          style={{
            position: 'absolute',
            top: 'var(--space-2)',
            right: 'var(--space-4)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            zIndex: 10,
            padding: 'var(--space-2)',
          }}
        >
          スキップ
        </button>

        {/* カルーセル */}
        <div ref={emblaRef} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            {tutorialSteps.map((step, index) => (
              <div
                key={index}
                style={{
                flex: '0 0 100%',
                minWidth: 0,
                padding: 'var(--space-8) var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: step.description ? 'flex-start' : 'center',
                textAlign: 'center',
                }}
              >
                {/* 画像 */}
                <div style={{
                  width: '180px',
                  height: '180px',
                  marginBottom: 'var(--space-6)',
                  position: 'relative',
                }}>
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="180px"
                  />
                </div>

                {/* タイトル */}
                <h2 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-3)',
                  lineHeight: '1.4',
                }}>
                  {step.title}
                </h2>

                {/* 説明 */}
                {step.description && (
                  <p style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-line',
                  }}>
                    {step.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ドットインジケーター */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}>
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: index === currentIndex 
                  ? 'var(--accent-primary)' 
                  : 'var(--border-default)',
              }}
            />
          ))}
        </div>

        {/* ナビゲーションボタン */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          padding: '0 var(--space-6) var(--space-6)',
        }}>
          {!isFirstStep && (
            <button
              onClick={handlePrev}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              戻る
            </button>
          )}
          <button
            onClick={handleNext}
            className="btn btn-primary"
            style={{ flex: isFirstStep ? 'auto' : 1, width: isFirstStep ? '100%' : 'auto' }}
          >
            {isLastStep ? 'はじめる' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  )
}
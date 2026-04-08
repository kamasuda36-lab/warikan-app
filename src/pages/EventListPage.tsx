import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Event } from '../types'
import { formatCurrency } from '../utils/settlement'

function getTotalAmount(event: Event): number {
  return event.payments.reduce((sum, p) => sum + p.amountInJPY, 0)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getEventEmoji(name: string): string {
  if (name.includes('旅') || name.includes('travel')) return '✈️'
  if (name.includes('飲み') || name.includes('ディナー') || name.includes('ランチ')) return '🍽️'
  if (name.includes('女子会')) return '🥂'
  return '🌸'
}

interface EventCardProps {
  event: Event
  onTap: (event: Event) => void
}

function EventCard({ event, onTap }: EventCardProps) {
  const total = getTotalAmount(event)

  return (
    <button
      onClick={() => onTap(event)}
      className="w-full text-left bg-white rounded-3xl p-5 mb-3 transition-all duration-200 active:scale-98 hover:shadow-soft-md"
      style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #ECC4CC 0%, #D4CAEC 100%)' }}
          >
            {getEventEmoji(event.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-base truncate" style={{ color: '#4A3828' }}>
              {event.name}
            </p>
            <p className="text-sm mt-0.5" style={{ color: '#9A8070' }}>
              {formatDate(event.date)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#ECC4CC', color: '#C07080' }}>
                👥 {event.participants.length}人
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#DEB888', color: '#906030' }}>
                💳 {event.payments.length}件
              </span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-3 text-right">
          <p className="font-medium text-base" style={{ color: '#B07840' }}>
            {formatCurrency(total)}
          </p>
          <span
            className="inline-block text-xs px-2.5 py-1 rounded-full mt-1 font-medium"
            style={
              event.isSettled
                ? { background: '#C0E0D5', color: '#3A8060' }
                : { background: '#ECC4CC', color: '#C07080' }
            }
          >
            {event.isSettled ? '✓ 精算済' : '未精算'}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function EventListPage() {
  const { state, dispatch } = useAppStore()
  const [filter, setFilter] = useState<'all' | 'unsettled' | 'settled'>('all')

  const filteredEvents = state.events.filter(e => {
    if (filter === 'settled') return e.isSettled
    if (filter === 'unsettled') return !e.isSettled
    return true
  })

  const unsettledCount = state.events.filter(e => !e.isSettled).length

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EC' }}>
      {/* ヘッダー */}
      <div
        className="sticky top-0 z-10 px-5 pb-4 pt-safe"
        style={{ background: 'linear-gradient(180deg, #F5F0EC 85%, transparent 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium" style={{ color: '#4A3828' }}>
              わりかん帳
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#9A8070' }}>
              {state.events.length}件のイベント
              {unsettledCount > 0 && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: '#ECC4CC', color: '#C07080' }}>
                  {unsettledCount}件未精算
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'new-event' } })}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-light transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
              boxShadow: '0 4px 16px rgba(180,100,130,0.40)',
            }}
          >
            ＋
          </button>
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-2 mt-4">
          {(['all', 'unsettled', 'settled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
              style={
                filter === f
                  ? { background: '#D4889A', color: '#fff' }
                  : { background: '#fff', color: '#9A8070', boxShadow: '0 1px 8px rgba(92,74,58,0.08)' }
              }
            >
              {f === 'all' ? 'すべて' : f === 'unsettled' ? '未精算' : '精算済'}
            </button>
          ))}
        </div>
      </div>

      {/* イベント一覧 */}
      <div className="px-5 pb-32">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4"
              style={{ background: 'linear-gradient(135deg, #ECC4CC, #D4CAEC)' }}
            >
              🌸
            </div>
            <p className="font-medium" style={{ color: '#4A3828' }}>
              イベントがありません
            </p>
            <p className="text-sm mt-1" style={{ color: '#9A8070' }}>
              ＋ボタンから新しいイベントを作成しましょう
            </p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onTap={e => dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: e.id } })}
            />
          ))
        )}
      </div>

      {/* フローティングバナー（未精算あり） */}
      {unsettledCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 pb-safe px-5 pt-3">
          <div
            className="rounded-3xl p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
              boxShadow: '0 8px 32px rgba(180, 100, 130, 0.40)',
            }}
          >
            <div>
              <p className="text-white text-sm font-medium">未精算のイベントがあります</p>
              <p className="text-white text-xs mt-0.5 opacity-80">{unsettledCount}件の精算が残っています</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white bg-opacity-30 flex items-center justify-center text-white">
              →
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

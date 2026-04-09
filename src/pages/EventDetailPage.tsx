import { useAppStore } from '../store/useAppStore'
import { Event, Payment } from '../types'
import { formatCurrency, calculateSettlements } from '../utils/settlement'

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm" style={{ color: '#9A8070' }}>
      <span>←</span> もどる
    </button>
  )
}

function getParticipantName(event: Event, id: string): string {
  return event.participants.find(p => p.id === id)?.name ?? '?'
}

function PaymentCard({ payment, event, onDelete, onEdit }: { payment: Payment; event: Event; onDelete: () => void; onEdit: () => void }) {
  const payer = getParticipantName(event, payment.payerId)
  const splitWith = payment.splitAmong.map(id => getParticipantName(event, id)).join('・')
  const hasCustom = !!payment.customSplits

  return (
    <div
      className="bg-white rounded-3xl p-4 mb-3 flex items-center gap-3"
      style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.09)' }}
    >
      <div
        className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-sm"
        style={{ background: 'linear-gradient(135deg, #ECC4CC, #D4CAEC)' }}
      >
        💳
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: '#4A3828' }}>
          {payment.description}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#9A8070' }}>
          {payer} が支払い
          {payment.currency !== 'JPY' && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: '#DEB888', color: '#906030' }}>
              {payment.currency} {payment.amount.toLocaleString()}
            </span>
          )}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#9A8070' }}>
          割り勘: {splitWith}
          {hasCustom && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs" style={{ background: '#D4CAEC', color: '#7A5090' }}>
              個別調整
            </span>
          )}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-medium text-sm" style={{ color: '#B07840' }}>
          {formatCurrency(payment.amountInJPY)}
        </p>
        <div className="flex gap-1 mt-1">
          <button
            onClick={onEdit}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#D4CAEC', color: '#7A5090' }}
          >
            編集
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#EDE5DE', color: '#9A8070' }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventDetailPage({ eventId }: { eventId: string }) {
  const { state, dispatch } = useAppStore()
  const event = state.events.find(e => e.id === eventId)

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0EC' }}>
        <div className="text-center">
          <p style={{ color: '#4A3828' }}>イベントが見つかりません</p>
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'list' } })}
            className="mt-4 px-6 py-3 rounded-full text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #D4889A, #B89CC8)' }}
          >
            一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  const totalAmount = event.payments.reduce((sum, p) => sum + p.amountInJPY, 0)
  const perPerson = event.participants.length > 0 ? Math.round(totalAmount / event.participants.length) : 0

  const deletePayment = (paymentId: string) => {
    const updated: Event = {
      ...event,
      payments: event.payments.filter(p => p.id !== paymentId),
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_EVENT', event: updated })
  }

  const goToSettlement = () => {
    const settlements = calculateSettlements(event.participants, event.payments)
    const updated: Event = { ...event, settlements, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_EVENT', event: updated })
    dispatch({ type: 'SET_PAGE', page: { name: 'settlement', eventId: event.id } })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EC' }}>
      {/* ヘッダー */}
      <div className="px-5 pt-safe pb-4">
        <div className="flex items-center justify-between">
          <BackButton onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'list' } })} />
          <button
            onClick={() => {
              if (window.confirm(`「${event.name}」を削除しますか？`)) {
                dispatch({ type: 'DELETE_EVENT', eventId: event.id })
                dispatch({ type: 'SET_PAGE', page: { name: 'list' } })
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: '#F5E8E8', color: '#C49090' }}
          >
            削除
          </button>
        </div>
        <h1 className="text-xl font-medium mt-3 truncate" style={{ color: '#4A3828' }}>
          {event.name}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#9A8070' }}>
          {new Date(event.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="px-5 pb-36 space-y-4">
        {/* サマリーカード */}
        <div
          className="rounded-3xl p-5 text-white"
          style={{
            background: 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
            boxShadow: '0 8px 24px rgba(180, 100, 130, 0.35)',
          }}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-3xl font-medium">{event.participants.length}</p>
              <p className="text-xs opacity-80 mt-1">参加者</p>
            </div>
            <div className="border-x border-white border-opacity-25">
              <p className="text-xl font-medium leading-tight">
                {formatCurrency(totalAmount).replace('￥', '¥')}
              </p>
              <p className="text-xs opacity-80 mt-1">合計</p>
            </div>
            <div>
              <p className="text-xl font-medium leading-tight">
                {formatCurrency(perPerson).replace('￥', '¥')}
              </p>
              <p className="text-xs opacity-80 mt-1">1人あたり</p>
            </div>
          </div>
        </div>

        {/* 参加者リスト */}
        <div
          className="bg-white rounded-3xl p-5"
          style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: '#7A5E50' }}>参加者</p>
          <div className="flex flex-wrap gap-2">
            {event.participants.map((p, idx) => (
              <span
                key={p.id}
                className="px-3 py-1.5 rounded-full text-sm text-white"
                style={{ background: `hsl(${idx * 47 + 340}, 65%, 68%)` }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* 支払い一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: '#7A5E50' }}>
              支払い ({event.payments.length}件)
            </p>
            <button
              onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'add-payment', eventId: event.id } })}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: '#ECC4CC', color: '#C07080' }}
            >
              ＋ 追加
            </button>
          </div>

          {event.payments.length === 0 ? (
            <div
              className="bg-white rounded-3xl p-8 text-center"
              style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.08)' }}
            >
              <p className="text-2xl mb-2">💳</p>
              <p className="text-sm" style={{ color: '#9A8070' }}>
                まだ支払いがありません
              </p>
              <p className="text-xs mt-1" style={{ color: '#9A8070' }}>
                ＋ 追加ボタンで記録しましょう
              </p>
            </div>
          ) : (
            event.payments.map(payment => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                event={event}
                onDelete={() => deletePayment(payment.id)}
                onEdit={() => dispatch({ type: 'SET_PAGE', page: { name: 'edit-payment', eventId: event.id, paymentId: payment.id } })}
              />
            ))
          )}
        </div>
      </div>

      {/* 精算ボタン */}
      {event.payments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 pb-safe px-5 pt-3">
          <button
            onClick={goToSettlement}
            className="w-full py-4 rounded-full text-white font-medium text-base transition-all duration-200 active:scale-98"
            style={{
              background: event.isSettled
                ? 'linear-gradient(135deg, #85C0AC, #5DA890)'
                : 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
              boxShadow: '0 8px 24px rgba(180, 100, 130, 0.35)',
            }}
          >
            {event.isSettled ? '✓ 精算結果を確認' : '精算する →'}
          </button>
        </div>
      )}
    </div>
  )
}

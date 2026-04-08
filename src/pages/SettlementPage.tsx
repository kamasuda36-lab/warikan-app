import { useAppStore } from '../store/useAppStore'
import { Event, Settlement } from '../types'
import { formatCurrency } from '../utils/settlement'

function getParticipantName(event: Event, id: string): string {
  return event.participants.find(p => p.id === id)?.name ?? '?'
}

function buildShareText(event: Event, settlements: Settlement[]): string {
  const total = event.payments.reduce((s, p) => s + p.amountInJPY, 0)
  const perPerson = Math.round(total / event.participants.length)

  let text = `【わりかん帳】${event.name}\n`
  text += `📅 ${new Date(event.date).toLocaleDateString('ja-JP')}\n`
  text += `👥 ${event.participants.map(p => p.name).join('・')}\n`
  text += `💰 合計: ¥${total.toLocaleString()} (1人 ¥${perPerson.toLocaleString()})\n\n`
  text += `【精算リスト】\n`

  if (settlements.length === 0) {
    text += 'みんな均等でした！精算不要です 🎉\n'
  } else {
    settlements.forEach(s => {
      const from = getParticipantName(event, s.from)
      const to = getParticipantName(event, s.to)
      text += `${from} → ${to}：¥${s.amount.toLocaleString()}\n`
    })
  }

  text += `\nわりかん帳アプリで計算しました ✿`
  return text
}

export default function SettlementPage({ eventId }: { eventId: string }) {
  const { state, dispatch } = useAppStore()
  const event = state.events.find(e => e.id === eventId)

  if (!event) return null

  const { settlements } = event
  const total = event.payments.reduce((s, p) => s + p.amountInJPY, 0)
  const shareText = buildShareText(event, settlements)

  const handleMarkSettled = () => {
    const updated: Event = { ...event, isSettled: true, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_EVENT', event: updated })
    dispatch({ type: 'SET_PAGE', page: { name: 'list' } })
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      const el = document.createElement('textarea')
      el.value = shareText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    window.open(`line://msg/text/${encodeURIComponent(shareText)}`, '_blank')
  }

  const handleCopyOnly = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      alert('コピーしました！LINEに貼り付けてください 📋')
    } catch {
      alert('コピーに失敗しました。テキストを手動でコピーしてください。')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EC' }}>
      {/* ヘッダー */}
      <div className="px-5 pt-safe pb-4">
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: event.id } })}
          className="flex items-center gap-1 text-sm"
          style={{ color: '#9A8070' }}
        >
          ← もどる
        </button>
        <h1 className="text-2xl font-medium mt-3" style={{ color: '#4A3828' }}>精算結果</h1>
        <p className="text-sm mt-0.5" style={{ color: '#9A8070' }}>{event.name}</p>
      </div>

      <div className="px-5 pb-40 space-y-4">
        {/* 合計サマリー */}
        <div
          className="rounded-3xl p-5 text-white text-center"
          style={{
            background: 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
            boxShadow: '0 8px 24px rgba(180, 100, 130, 0.35)',
          }}
        >
          <p className="text-sm opacity-80 mb-1">合計金額</p>
          <p className="text-3xl font-medium">{formatCurrency(total)}</p>
          <p className="text-sm opacity-80 mt-1">
            {event.participants.length}人 / 1人あたり {formatCurrency(Math.round(total / event.participants.length))}
          </p>
        </div>

        {/* 精算リスト */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: '#7A5E50' }}>
            送金リスト（{settlements.length}件）
          </p>

          {settlements.length === 0 ? (
            <div
              className="bg-white rounded-3xl p-8 text-center"
              style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.08)' }}
            >
              <p className="text-3xl mb-3">🎉</p>
              <p className="font-medium" style={{ color: '#4A3828' }}>精算不要です！</p>
              <p className="text-sm mt-1" style={{ color: '#9A8070' }}>みんな均等に支払っています</p>
            </div>
          ) : (
            settlements.map((s, idx) => {
              const from = getParticipantName(event, s.from)
              const to = getParticipantName(event, s.to)
              const fromIdx = event.participants.findIndex(p => p.id === s.from)
              const toIdx = event.participants.findIndex(p => p.id === s.to)

              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-4 mb-3 flex items-center gap-3"
                  style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.09)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm text-white font-medium"
                    style={{ background: `hsl(${fromIdx * 47 + 340}, 65%, 68%)` }}
                  >
                    {from[0]}
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs" style={{ color: '#9A8070' }}>{from} が</p>
                    <p className="text-sm font-medium" style={{ color: '#B07840' }}>
                      {formatCurrency(s.amount)} を送金
                    </p>
                    <p className="text-xs" style={{ color: '#9A8070' }}>{to} へ</p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm text-white font-medium"
                    style={{ background: `hsl(${toIdx * 47 + 340}, 65%, 68%)` }}
                  >
                    {to[0]}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 支払い内訳 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#7A5E50' }}>支払い内訳</p>
          {event.payments.map(p => (
            <div key={p.id} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #EDE5DE' }}>
              <div>
                <p className="text-sm" style={{ color: '#4A3828' }}>{p.description}</p>
                <p className="text-xs mt-0.5" style={{ color: '#9A8070' }}>
                  {getParticipantName(event, p.payerId)} が立替
                  {p.currency !== 'JPY' && ` (${p.currency} ${p.amount.toLocaleString()})`}
                  {p.customSplits && <span className="ml-1 text-xs" style={{ color: '#B89CC8' }}>個別調整あり</span>}
                </p>
              </div>
              <p className="text-sm font-medium" style={{ color: '#B07840' }}>
                {formatCurrency(p.amountInJPY)}
              </p>
            </div>
          ))}
        </div>

        {/* シェアテキストプレビュー */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#7A5E50' }}>シェア用テキスト</p>
          <pre
            className="text-xs whitespace-pre-wrap leading-relaxed"
            style={{ color: '#7A5E50', fontFamily: '"M PLUS Rounded 1c", sans-serif' }}
          >
            {shareText}
          </pre>
        </div>
      </div>

      {/* ボタン群 */}
      <div className="fixed bottom-0 left-0 right-0 pb-safe px-5 pt-3 space-y-3">
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-full font-medium text-base transition-all duration-200 active:scale-98 flex items-center justify-center gap-2"
          style={{
            background: '#06C755',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(6, 199, 85, 0.35)',
          }}
        >
          <span className="text-lg">💬</span> LINEで送る
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleCopyOnly}
            className="flex-1 py-3.5 rounded-full font-medium text-sm transition-all active:scale-98"
            style={{
              background: '#fff',
              color: '#7A5E50',
              boxShadow: '0 2px 16px rgba(92,74,58,0.12)',
            }}
          >
            📋 コピー
          </button>
          <button
            onClick={handleMarkSettled}
            className="flex-1 py-3.5 rounded-full font-medium text-sm transition-all active:scale-98 text-white"
            style={{
              background: 'linear-gradient(135deg, #85C0AC, #5DA890)',
              boxShadow: '0 4px 16px rgba(100, 180, 150, 0.35)',
            }}
          >
            ✓ 精算完了
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Currency, Payment, Event } from '../types'
import { generateId } from '../utils/settlement'

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'JPY', label: '日本円', symbol: '¥' },
  { code: 'USD', label: 'US ドル', symbol: '$' },
  { code: 'EUR', label: 'ユーロ', symbol: '€' },
  { code: 'GBP', label: 'ポンド', symbol: '£' },
  { code: 'KRW', label: '韓国ウォン', symbol: '₩' },
  { code: 'CNY', label: '中国元', symbol: '¥' },
  { code: 'TWD', label: '台湾ドル', symbol: 'NT$' },
  { code: 'AUD', label: 'オーストラリアドル', symbol: 'A$' },
  { code: 'SGD', label: 'シンガポールドル', symbol: 'S$' },
  { code: 'THB', label: 'タイバーツ', symbol: '฿' },
]

// Frankfurter API でレートを取得（JPYへの換算）
async function fetchRate(from: Currency): Promise<number> {
  if (from === 'JPY') return 1
  const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=JPY`)
  const data = await res.json()
  return data.rates?.JPY ?? 1
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm" style={{ color: '#B8A898' }}>
      <span>←</span> もどる
    </button>
  )
}

export default function AddPaymentPage({ eventId }: { eventId: string }) {
  const { state, dispatch } = useAppStore()
  const event = state.events.find(e => e.id === eventId)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('JPY')
  const [payerId, setPayerId] = useState(event?.participants[0]?.id ?? '')
  const [splitAmong, setSplitAmong] = useState<string[]>(event?.participants.map(p => p.id) ?? [])
  const [rate, setRate] = useState(1)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (currency === 'JPY') { setRate(1); return }
    setRateLoading(true)
    setRateError('')
    fetchRate(currency)
      .then(r => { setRate(r); setRateLoading(false) })
      .catch(() => { setRateError('レート取得に失敗しました'); setRateLoading(false) })
  }, [currency])

  if (!event) {
    return null
  }

  const numAmount = parseFloat(amount) || 0
  const amountInJPY = Math.round(numAmount * rate)
  const currencyInfo = CURRENCIES.find(c => c.code === currency)!

  const toggleSplit = (id: string) => {
    setSplitAmong(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleAdd = () => {
    setError('')
    if (!description.trim()) { setError('内容を入力してください'); return }
    if (numAmount <= 0) { setError('金額を入力してください'); return }
    if (!payerId) { setError('支払った人を選択してください'); return }
    if (splitAmong.length === 0) { setError('割り勘する人を選択してください'); return }

    const newPayment: Payment = {
      id: generateId(),
      payerId,
      amount: numAmount,
      currency,
      amountInJPY,
      description: description.trim(),
      splitAmong,
    }

    const updated: Event = {
      ...event,
      payments: [...event.payments, newPayment],
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_EVENT', event: updated })
    dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: event.id } })
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>
      {/* ヘッダー */}
      <div className="px-5 pt-safe pb-4">
        <BackButton onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: event.id } })} />
        <h1 className="text-2xl font-medium mt-3" style={{ color: '#5C4A3A' }}>
          支払いを追加
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#B8A898' }}>{event.name}</p>
      </div>

      <div className="px-5 pb-36 space-y-4">
        {/* 内容 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.08)' }}>
          <label className="text-sm font-medium block mb-2" style={{ color: '#8A7060' }}>内容</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="例：夕食、ホテル代、タクシー"
            className="w-full bg-transparent text-base outline-none"
            style={{ color: '#5C4A3A', borderBottom: '1.5px solid #E8C9A8', paddingBottom: '6px' }}
          />
        </div>

        {/* 金額・通貨 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.08)' }}>
          <label className="text-sm font-medium block mb-3" style={{ color: '#8A7060' }}>金額</label>

          {/* 通貨選択 */}
          <div className="flex gap-2 flex-wrap mb-4">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  currency === c.code
                    ? { background: '#E8B4BC', color: '#fff' }
                    : { background: '#F5F0EB', color: '#8A7060' }
                }
              >
                {c.code}
              </button>
            ))}
          </div>

          {/* 金額入力 */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-medium" style={{ color: '#C4956A' }}>{currencyInfo.symbol}</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-2xl font-medium outline-none"
              style={{ color: '#5C4A3A', borderBottom: '1.5px solid #E8C9A8', paddingBottom: '4px' }}
            />
          </div>

          {/* 円換算表示 */}
          {currency !== 'JPY' && (
            <div className="mt-3 p-3 rounded-2xl" style={{ background: '#F5F0EB' }}>
              {rateLoading ? (
                <p className="text-xs text-center" style={{ color: '#B8A898' }}>レート取得中...</p>
              ) : rateError ? (
                <p className="text-xs text-center" style={{ color: '#D4909A' }}>{rateError}</p>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: '#C4956A' }}>
                    ≈ ¥{amountInJPY.toLocaleString()} 円
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#B8A898' }}>
                    1 {currency} = ¥{rate.toFixed(2)}（Frankfurter API）
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 支払った人 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.08)' }}>
          <label className="text-sm font-medium block mb-3" style={{ color: '#8A7060' }}>
            支払った人
          </label>
          <div className="flex flex-wrap gap-2">
            {event.participants.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setPayerId(p.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  payerId === p.id
                    ? { background: `hsl(${idx * 47 + 340}, 60%, 75%)`, color: '#fff' }
                    : { background: '#F5F0EB', color: '#8A7060' }
                }
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 割り勘する人 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium" style={{ color: '#8A7060' }}>
              割り勘する人
            </label>
            <button
              onClick={() =>
                setSplitAmong(
                  splitAmong.length === event.participants.length
                    ? []
                    : event.participants.map(p => p.id)
                )
              }
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: '#F5D7DB', color: '#D4909A' }}
            >
              {splitAmong.length === event.participants.length ? '全解除' : '全員'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {event.participants.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => toggleSplit(p.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  splitAmong.includes(p.id)
                    ? { background: `hsl(${idx * 47 + 340}, 60%, 75%)`, color: '#fff' }
                    : { background: '#F5F0EB', color: '#B8A898' }
                }
              >
                {p.name}
              </button>
            ))}
          </div>
          {splitAmong.length > 0 && numAmount > 0 && (
            <p className="text-xs mt-3 text-center" style={{ color: '#B8A898' }}>
              1人あたり ¥{Math.round(amountInJPY / splitAmong.length).toLocaleString()}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-center px-4 py-3 rounded-2xl" style={{ background: '#FEE8EC', color: '#D4909A' }}>
            {error}
          </p>
        )}
      </div>

      {/* 追加ボタン */}
      <div className="fixed bottom-0 left-0 right-0 pb-safe px-5 pt-3">
        <button
          onClick={handleAdd}
          className="w-full py-4 rounded-full text-white font-medium text-base transition-all duration-200 active:scale-98"
          style={{
            background: 'linear-gradient(135deg, #E8B4BC 0%, #C9B8D8 100%)',
            boxShadow: '0 8px 24px rgba(200, 130, 150, 0.30)',
          }}
        >
          支払いを追加する ＋
        </button>
      </div>
    </div>
  )
}

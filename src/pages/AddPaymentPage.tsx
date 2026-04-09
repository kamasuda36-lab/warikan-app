import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Currency, Payment, Event } from '../types'
import { generateId, calculateSettlements } from '../utils/settlement'

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

async function fetchRate(from: Currency): Promise<number> {
  if (from === 'JPY') return 1
  const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=JPY`)
  const data = await res.json()
  return data.rates?.JPY ?? 1
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm" style={{ color: '#9A8070' }}>
      <span>←</span> もどる
    </button>
  )
}

// ロック済みの人を除いた残り金額を均等配分して splits を更新
function redistributeToUnlocked(
  currentSplits: Record<string, string>,
  lockedIds: Set<string>,
  allIds: string[],
  totalJPY: number
): Record<string, string> {
  const lockedTotal = allIds
    .filter(id => lockedIds.has(id))
    .reduce((s, id) => s + (parseInt(currentSplits[id]) || 0), 0)
  const unlockedIds = allIds.filter(id => !lockedIds.has(id))
  const remaining = totalJPY - lockedTotal

  const newSplits = { ...currentSplits }
  if (unlockedIds.length === 0) return newSplits

  const base = Math.floor(remaining / unlockedIds.length)
  const rem = remaining - base * unlockedIds.length
  unlockedIds.forEach((id, i) => {
    newSplits[id] = String(i === 0 ? base + rem : base)
  })
  return newSplits
}

interface Props {
  eventId: string
  paymentId?: string // 編集時に渡す
}

export default function AddPaymentPage({ eventId, paymentId }: Props) {
  const { state, dispatch } = useAppStore()
  const event = state.events.find(e => e.id === eventId)
  const editingPayment = paymentId ? event?.payments.find(p => p.id === paymentId) : undefined
  const isEditing = !!editingPayment

  const [description, setDescription] = useState(editingPayment?.description ?? '')
  const [amount, setAmount] = useState(editingPayment ? String(editingPayment.amount) : '')
  const [currency, setCurrency] = useState<Currency>(editingPayment?.currency ?? 'JPY')
  const [payerId, setPayerId] = useState(editingPayment?.payerId ?? event?.participants[0]?.id ?? '')
  const [splitAmong, setSplitAmong] = useState<string[]>(
    editingPayment?.splitAmong ?? event?.participants.map(p => p.id) ?? []
  )
  const [rate, setRate] = useState(1)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState('')
  const [error, setError] = useState('')

  // 個別調整
  const [useCustomSplit, setUseCustomSplit] = useState(!!editingPayment?.customSplits)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(
    editingPayment?.customSplits
      ? Object.fromEntries(Object.entries(editingPayment.customSplits).map(([k, v]) => [k, String(v)]))
      : {}
  )
  // どの人が「手動確定済み」か
  const [lockedIds, setLockedIds] = useState<Set<string>>(
    editingPayment?.customSplits ? new Set(Object.keys(editingPayment.customSplits)) : new Set()
  )

  useEffect(() => {
    if (currency === 'JPY') { setRate(1); return }
    setRateLoading(true)
    setRateError('')
    fetchRate(currency)
      .then(r => { setRate(r); setRateLoading(false) })
      .catch(() => { setRateError('レート取得に失敗しました'); setRateLoading(false) })
  }, [currency])

  if (!event) return null

  const numAmount = parseFloat(amount) || 0
  const amountInJPY = editingPayment?.amountInJPY
    ? (currency === editingPayment.currency ? editingPayment.amountInJPY : Math.round(numAmount * rate))
    : Math.round(numAmount * rate)
  const amountInJPYCalc = Math.round(numAmount * rate)
  const currencyInfo = CURRENCIES.find(c => c.code === currency)!

  const customTotal = splitAmong.reduce((s, id) => s + (parseInt(customSplits[id]) || 0), 0)
  const customDiff = amountInJPYCalc - customTotal
  const customOk = Math.abs(customDiff) <= 1

  // 均等で初期化（ロックなし）
  const initCustomSplitsEqual = (ids: string[], totalJPY: number) => {
    if (ids.length === 0) return
    const base = Math.floor(totalJPY / ids.length)
    const rem = totalJPY - base * ids.length
    const splits: Record<string, string> = {}
    ids.forEach((id, i) => { splits[id] = String(i === 0 ? base + rem : base) })
    setCustomSplits(splits)
    setLockedIds(new Set())
  }

  const handleToggleCustomSplit = () => {
    if (!useCustomSplit) {
      initCustomSplitsEqual(splitAmong, amountInJPYCalc)
    }
    setUseCustomSplit(v => !v)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
    if (useCustomSplit) {
      const newJPY = Math.round((parseFloat(e.target.value) || 0) * rate)
      // ロックされていない人に再配分
      const newSplits = redistributeToUnlocked(customSplits, lockedIds, splitAmong, newJPY)
      setCustomSplits(newSplits)
    }
  }

  const toggleSplit = (id: string) => {
    const next = splitAmong.includes(id)
      ? splitAmong.filter(x => x !== id)
      : [...splitAmong, id]
    setSplitAmong(next)
    if (useCustomSplit) {
      const newLocked = new Set(lockedIds)
      if (!next.includes(id)) newLocked.delete(id)
      setLockedIds(newLocked)
      const newSplits = redistributeToUnlocked(customSplits, newLocked, next, amountInJPYCalc)
      setCustomSplits(newSplits)
    }
  }

  // 1人の金額を変更 → その人をロック → 残りをアンロック勢で均等配分
  const handleCustomAmountChange = (id: string, newVal: string) => {
    const newLocked = new Set(lockedIds)
    newLocked.add(id)
    setLockedIds(newLocked)
    const tentative = { ...customSplits, [id]: newVal }
    const newSplits = redistributeToUnlocked(tentative, newLocked, splitAmong, amountInJPYCalc)
    setCustomSplits(newSplits)
  }

  // ロック解除 → アンロック勢に再配分
  const handleUnlock = (id: string) => {
    const newLocked = new Set(lockedIds)
    newLocked.delete(id)
    setLockedIds(newLocked)
    const newSplits = redistributeToUnlocked(customSplits, newLocked, splitAmong, amountInJPYCalc)
    setCustomSplits(newSplits)
  }

  const buildPayment = (existingId?: string): Payment | null => {
    setError('')
    if (!description.trim()) { setError('内容を入力してください'); return null }
    if (numAmount <= 0) { setError('金額を入力してください'); return null }
    if (!payerId) { setError('支払った人を選択してください'); return null }
    if (splitAmong.length === 0) { setError('割り勘する人を選択してください'); return null }
    if (useCustomSplit && !customOk) {
      setError(`合計が¥${Math.abs(customDiff).toLocaleString()}合いません。調整してください`)
      return null
    }
    return {
      id: existingId ?? generateId(),
      payerId,
      amount: numAmount,
      currency,
      amountInJPY: amountInJPYCalc,
      description: description.trim(),
      splitAmong,
      ...(useCustomSplit && {
        customSplits: Object.fromEntries(
          splitAmong.map(id => [id, parseInt(customSplits[id]) || 0])
        )
      }),
    }
  }

  // 保存してイベント詳細へ
  const handleSave = () => {
    const payment = buildPayment(editingPayment?.id)
    if (!payment) return
    let newPayments: Payment[]
    if (isEditing) {
      newPayments = event.payments.map(p => p.id === payment.id ? payment : p)
    } else {
      newPayments = [...event.payments, payment]
    }
    const updated: Event = { ...event, payments: newPayments, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_EVENT', event: updated })
    dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: event.id } })
  }

  // 保存してそのまま精算へ
  const handleSaveAndSettle = () => {
    const payment = buildPayment(editingPayment?.id)
    if (!payment) return
    let newPayments: Payment[]
    if (isEditing) {
      newPayments = event.payments.map(p => p.id === payment.id ? payment : p)
    } else {
      newPayments = [...event.payments, payment]
    }
    const settlements = calculateSettlements(event.participants, newPayments)
    const updated: Event = { ...event, payments: newPayments, settlements, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_EVENT', event: updated })
    dispatch({ type: 'SET_PAGE', page: { name: 'settlement', eventId: event.id } })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EC' }}>
      {/* ヘッダー */}
      <div
        className="sticky top-0 z-10 px-5 pt-safe pb-4"
        style={{ background: 'linear-gradient(180deg, #F5F0EC 88%, transparent 100%)' }}
      >
        <BackButton onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: event.id } })} />
        <h1 className="text-2xl font-medium mt-3" style={{ color: '#4A3828' }}>
          {isEditing ? '支払いを編集' : '支払いを追加'}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#9A8070' }}>{event.name}</p>
      </div>

      <div className="px-5 pb-40 space-y-4">
        {/* 内容 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <label className="text-sm font-medium block mb-2" style={{ color: '#7A5E50' }}>内容</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="例：夕食、ホテル代、タクシー"
            className="w-full bg-transparent text-base outline-none"
            style={{ color: '#4A3828', borderBottom: '1.5px solid #D4A880', paddingBottom: '6px' }}
          />
        </div>

        {/* 金額・通貨 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <label className="text-sm font-medium block mb-3" style={{ color: '#7A5E50' }}>金額</label>
          <div className="flex gap-2 flex-wrap mb-4">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={currency === c.code ? { background: '#D4889A', color: '#fff' } : { background: '#EDE5DE', color: '#7A5E50' }}
              >
                {c.code}
              </button>
            ))}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-medium" style={{ color: '#B07840' }}>{currencyInfo.symbol}</span>
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="flex-1 bg-transparent text-2xl font-medium outline-none"
              style={{ color: '#4A3828', borderBottom: '1.5px solid #D4A880', paddingBottom: '4px' }}
            />
          </div>
          {currency !== 'JPY' && (
            <div className="mt-3 p-3 rounded-2xl" style={{ background: '#EDE5DE' }}>
              {rateLoading ? (
                <p className="text-xs text-center" style={{ color: '#9A8070' }}>レート取得中...</p>
              ) : rateError ? (
                <p className="text-xs text-center" style={{ color: '#C07080' }}>{rateError}</p>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: '#B07840' }}>≈ ¥{amountInJPYCalc.toLocaleString()} 円</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9A8070' }}>1 {currency} = ¥{rate.toFixed(2)}（Frankfurter API）</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 支払った人 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <label className="text-sm font-medium block mb-3" style={{ color: '#7A5E50' }}>支払った人</label>
          <div className="flex flex-wrap gap-2">
            {event.participants.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setPayerId(p.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={payerId === p.id ? { background: `hsl(${idx * 47 + 340}, 65%, 68%)`, color: '#fff' } : { background: '#EDE5DE', color: '#7A5E50' }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 割り勘する人 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium" style={{ color: '#7A5E50' }}>割り勘する人</label>
            <button
              onClick={() => {
                const next = splitAmong.length === event.participants.length ? [] : event.participants.map(p => p.id)
                setSplitAmong(next)
                if (useCustomSplit) {
                  setLockedIds(new Set())
                  initCustomSplitsEqual(next, amountInJPYCalc)
                }
              }}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: '#ECC4CC', color: '#C07080' }}
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
                    ? { background: `hsl(${idx * 47 + 340}, 65%, 68%)`, color: '#fff' }
                    : { background: '#EDE5DE', color: '#9A8070' }
                }
              >
                {p.name}
              </button>
            ))}
          </div>

          {splitAmong.length > 0 && numAmount > 0 && (
            <div className="mt-4">
              {!useCustomSplit ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: '#9A8070' }}>
                    1人あたり ¥{Math.round(amountInJPYCalc / splitAmong.length).toLocaleString()}
                  </p>
                  <button
                    onClick={handleToggleCustomSplit}
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: '#EDE5DE', color: '#7A5E50' }}
                  >
                    ✏️ 金額を調整する
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: '#7A5E50' }}>個別に金額を設定</p>
                    <button
                      onClick={() => {
                        initCustomSplitsEqual(splitAmong, amountInJPYCalc)
                        setUseCustomSplit(false)
                      }}
                      className="text-xs px-3 py-1.5 rounded-full"
                      style={{ background: '#EDE5DE', color: '#9A8070' }}
                    >
                      均等に戻す
                    </button>
                  </div>

                  <p className="text-xs mb-3" style={{ color: '#9A8070' }}>
                    💡 金額を入力すると固定され、残りが他の人に自動配分されます。🔓 で解除できます
                  </p>

                  <div className="space-y-2">
                    {splitAmong.map((id) => {
                      const p = event.participants.find(p => p.id === id)!
                      const pidx = event.participants.findIndex(p => p.id === id)
                      const isLocked = lockedIds.has(id)
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 p-3 rounded-2xl"
                          style={{ background: isLocked ? '#EDE0F5' : '#F5F0EC' }}
                        >
                          <span
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white font-medium"
                            style={{ background: `hsl(${pidx * 47 + 340}, 65%, 68%)` }}
                          >
                            {p.name[0]}
                          </span>
                          <span className="flex-1 text-sm font-medium" style={{ color: '#4A3828' }}>
                            {p.name}
                            {isLocked && (
                              <span className="ml-1 text-xs" style={{ color: '#9A70C0' }}>確定</span>
                            )}
                          </span>
                          {/* ロック解除ボタン */}
                          {isLocked && (
                            <button
                              onClick={() => handleUnlock(id)}
                              className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                              style={{ background: '#D4CAEC', color: '#7A5090' }}
                            >
                              🔓
                            </button>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-sm" style={{ color: '#B07840' }}>¥</span>
                            <input
                              type="number"
                              value={customSplits[id] ?? ''}
                              onChange={e => handleCustomAmountChange(id, e.target.value)}
                              className="w-24 text-right text-sm font-medium rounded-xl px-2 py-1 outline-none"
                              style={{
                                color: '#4A3828',
                                background: isLocked ? '#EDE0F5' : '#fff',
                                border: isLocked ? '1.5px solid #B89CC8' : '1.5px solid #D4A880',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 合計チェック */}
                  <div className="mt-3 p-3 rounded-2xl text-center"
                    style={{ background: customOk ? '#D8EEE6' : '#FEE8EC' }}>
                    <p className="text-xs font-medium" style={{ color: customOk ? '#3A8060' : '#C07080' }}>
                      {customOk
                        ? `✓ 合計 ¥${customTotal.toLocaleString()} ぴったり`
                        : customDiff > 0
                          ? `¥${customDiff.toLocaleString()} 足りません`
                          : `¥${Math.abs(customDiff).toLocaleString()} 超過しています`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-center px-4 py-3 rounded-2xl" style={{ background: '#FEE8EC', color: '#C07080' }}>
            {error}
          </p>
        )}
      </div>

      {/* ボタン */}
      <div className="fixed bottom-0 left-0 right-0 pb-safe px-5 pt-3 space-y-2">
        <button
          onClick={handleSaveAndSettle}
          className="w-full py-4 rounded-full text-white font-medium text-base transition-all duration-200 active:scale-98"
          style={{
            background: 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
            boxShadow: '0 8px 24px rgba(180, 100, 130, 0.40)',
          }}
        >
          {isEditing ? '保存して精算する →' : '保存して精算する →'}
        </button>
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-full font-medium text-sm transition-all duration-200 active:scale-98"
          style={{ background: '#fff', color: '#9A8070', boxShadow: '0 2px 12px rgba(92,74,58,0.10)' }}
        >
          {isEditing ? '保存してもどる' : '保存してもどる'}
        </button>
      </div>
    </div>
  )
}

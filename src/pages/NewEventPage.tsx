import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Event, Participant } from '../types'
import { generateId } from '../utils/settlement'

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm" style={{ color: '#9A8070' }}>
      <span>←</span> もどる
    </button>
  )
}

export default function NewEventPage() {
  const { dispatch } = useAppStore()
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [participants, setParticipants] = useState<Participant[]>([
    { id: generateId(), name: '' },
    { id: generateId(), name: '' },
  ])
  const [error, setError] = useState('')

  const addParticipant = () => {
    setParticipants(prev => [...prev, { id: generateId(), name: '' }])
  }

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) return
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  const updateName = (id: string, name: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, name } : p))
  }

  const handleCreate = () => {
    setError('')
    if (!eventName.trim()) {
      setError('イベント名を入力してください')
      return
    }
    const validParticipants = participants.filter(p => p.name.trim())
    if (validParticipants.length < 2) {
      setError('参加者を2人以上入力してください')
      return
    }

    const now = new Date().toISOString()
    const newEvent: Event = {
      id: generateId(),
      name: eventName.trim(),
      date: eventDate,
      participants: validParticipants.map(p => ({ ...p, name: p.name.trim() })),
      payments: [],
      settlements: [],
      isSettled: false,
      createdAt: now,
      updatedAt: now,
    }

    dispatch({ type: 'ADD_EVENT', event: newEvent })
    dispatch({ type: 'SET_PAGE', page: { name: 'event-detail', eventId: newEvent.id } })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EC' }}>
      {/* ヘッダー */}
      <div className="px-5 pt-safe pb-4">
        <BackButton onClick={() => dispatch({ type: 'SET_PAGE', page: { name: 'list' } })} />
        <h1 className="text-2xl font-medium mt-3" style={{ color: '#4A3828' }}>
          新しいイベント
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#9A8070' }}>
          旅行・食事・イベントを記録しましょう
        </p>
      </div>

      <div className="px-5 pb-32 space-y-5">
        {/* イベント名 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <label className="text-sm font-medium block mb-2" style={{ color: '#7A5E50' }}>
            イベント名
          </label>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="例：京都女子旅 🌸"
            className="w-full bg-transparent text-base outline-none"
            style={{ color: '#4A3828', borderBottom: '1.5px solid #D4A880', paddingBottom: '6px' }}
          />
        </div>

        {/* 日付 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <label className="text-sm font-medium block mb-2" style={{ color: '#7A5E50' }}>
            日付
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            className="w-full bg-transparent text-base outline-none"
            style={{ color: '#4A3828', borderBottom: '1.5px solid #D4A880', paddingBottom: '6px' }}
          />
        </div>

        {/* 参加者 */}
        <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(92,74,58,0.10)' }}>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium" style={{ color: '#7A5E50' }}>
              参加者 ({participants.length}人)
            </label>
            <button
              onClick={addParticipant}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: '#ECC4CC', color: '#C07080' }}
            >
              ＋ 追加
            </button>
          </div>
          <div className="space-y-3">
            {participants.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium text-white"
                  style={{ background: `hsl(${idx * 47 + 340}, 65%, 68%)` }}
                >
                  {p.name ? p.name[0] : (idx + 1)}
                </div>
                <input
                  type="text"
                  value={p.name}
                  onChange={e => updateName(p.id, e.target.value)}
                  placeholder={`参加者${idx + 1}の名前`}
                  className="flex-1 bg-transparent text-base outline-none"
                  style={{ color: '#4A3828', borderBottom: '1px solid #D4A880', paddingBottom: '4px' }}
                />
                {participants.length > 2 && (
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EDE5DE', color: '#9A8070' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-center px-4 py-3 rounded-2xl" style={{ background: '#FEE8EC', color: '#C07080' }}>
            {error}
          </p>
        )}
      </div>

      {/* 作成ボタン */}
      <div className="fixed bottom-0 left-0 right-0 pb-safe px-5 pt-3">
        <button
          onClick={handleCreate}
          className="w-full py-4 rounded-full text-white font-medium text-base transition-all duration-200 active:scale-98"
          style={{
            background: 'linear-gradient(135deg, #D4889A 0%, #B89CC8 100%)',
            boxShadow: '0 8px 24px rgba(180, 100, 130, 0.40)',
          }}
        >
          イベントを作成する ✓
        </button>
      </div>
    </div>
  )
}

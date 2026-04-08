import { createContext, useContext, useReducer, useEffect, ReactNode, createElement } from 'react'
import { Event, Page } from '../types'

const SAMPLE_EVENTS: Event[] = [
  {
    id: 'sample-1',
    name: '京都女子旅 🌸',
    date: '2026-03-22',
    participants: [
      { id: 'p1', name: 'さくら' },
      { id: 'p2', name: 'ゆい' },
      { id: 'p3', name: 'はな' },
      { id: 'p4', name: 'みお' },
    ],
    payments: [
      { id: 'pay1', payerId: 'p1', amount: 24000, currency: 'JPY', amountInJPY: 24000, description: '宿泊費', splitAmong: ['p1','p2','p3','p4'] },
      { id: 'pay2', payerId: 'p2', amount: 8400, currency: 'JPY', amountInJPY: 8400, description: '夕食', splitAmong: ['p1','p2','p3','p4'] },
      { id: 'pay3', payerId: 'p3', amount: 5200, currency: 'JPY', amountInJPY: 5200, description: 'ランチ', splitAmong: ['p1','p2','p3','p4'] },
    ],
    settlements: [],
    isSettled: true,
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-25T15:30:00Z',
  },
  {
    id: 'sample-2',
    name: '韓国旅行 🇰🇷',
    date: '2026-02-14',
    participants: [
      { id: 'p5', name: 'りな' },
      { id: 'p6', name: 'あや' },
      { id: 'p7', name: 'まい' },
    ],
    payments: [
      { id: 'pay4', payerId: 'p5', amount: 150000, currency: 'KRW', amountInJPY: 16500, description: 'ホテル代', splitAmong: ['p5','p6','p7'] },
      { id: 'pay5', payerId: 'p6', amount: 42000, currency: 'JPY', amountInJPY: 42000, description: '航空券補填', splitAmong: ['p5','p6','p7'] },
      { id: 'pay6', payerId: 'p7', amount: 18000, currency: 'JPY', amountInJPY: 18000, description: 'コスメ・お土産', splitAmong: ['p5','p6','p7'] },
    ],
    settlements: [],
    isSettled: false,
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-17T20:00:00Z',
  },
  {
    id: 'sample-3',
    name: '女子会ディナー 🍽️',
    date: '2026-01-30',
    participants: [
      { id: 'p8', name: 'かな' },
      { id: 'p9', name: 'のん' },
      { id: 'p10', name: 'ちえ' },
      { id: 'p11', name: 'ゆか' },
      { id: 'p12', name: 'れい' },
    ],
    payments: [
      { id: 'pay7', payerId: 'p8', amount: 28500, currency: 'JPY', amountInJPY: 28500, description: 'コース料理', splitAmong: ['p8','p9','p10','p11','p12'] },
      { id: 'pay8', payerId: 'p9', amount: 6000, currency: 'JPY', amountInJPY: 6000, description: 'ワイン', splitAmong: ['p8','p9','p10','p11','p12'] },
    ],
    settlements: [],
    isSettled: true,
    createdAt: '2026-01-28T12:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
]

const STORAGE_KEY = 'warikan-events'

interface AppState {
  events: Event[]
  currentPage: Page
}

type Action =
  | { type: 'SET_PAGE'; page: Page }
  | { type: 'ADD_EVENT'; event: Event }
  | { type: 'UPDATE_EVENT'; event: Event }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'LOAD_EVENTS'; events: Event[] }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPage: action.page }
    case 'ADD_EVENT':
      return { ...state, events: [action.event, ...state.events] }
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(e => e.id === action.event.id ? action.event : e),
      }
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter(e => e.id !== action.eventId) }
    case 'LOAD_EVENTS':
      return { ...state, events: action.events }
    default:
      return state
  }
}

const initialState: AppState = {
  events: [],
  currentPage: { name: 'list' },
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load from localStorage on mount (fallback to sample data)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const events = JSON.parse(stored) as Event[]
        if (events.length > 0) {
          dispatch({ type: 'LOAD_EVENTS', events })
          return
        }
      }
    } catch {
      // ignore
    }
    // 初回起動時はサンプルデータを表示
    dispatch({ type: 'LOAD_EVENTS', events: SAMPLE_EVENTS })
  }, [])

  // Save to localStorage on events change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events))
  }, [state.events])

  return createElement(AppContext.Provider, { value: { state, dispatch } }, children)
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}

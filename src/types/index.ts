export type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW' | 'CNY' | 'TWD' | 'AUD' | 'SGD' | 'THB'

export interface Participant {
  id: string
  name: string
}

export interface Payment {
  id: string
  payerId: string
  amount: number
  currency: Currency
  amountInJPY: number
  description: string
  splitAmong: string[] // participant IDs
}

export interface Settlement {
  from: string // participant ID
  to: string   // participant ID
  amount: number
}

export interface Event {
  id: string
  name: string
  date: string
  participants: Participant[]
  payments: Payment[]
  settlements: Settlement[]
  isSettled: boolean
  createdAt: string
  updatedAt: string
}

export type Page =
  | { name: 'list' }
  | { name: 'new-event' }
  | { name: 'event-detail'; eventId: string }
  | { name: 'add-payment'; eventId: string }
  | { name: 'settlement'; eventId: string }

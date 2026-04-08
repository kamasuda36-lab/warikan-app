import { Payment, Participant, Settlement } from '../types'

/**
 * 最小送金回数で精算を計算するアルゴリズム
 * 各参加者の収支を計算し、貪欲法で最適化する
 */
export function calculateSettlements(
  participants: Participant[],
  payments: Payment[],
): Settlement[] {
  const balance: Record<string, number> = {}

  // 全参加者の収支を初期化
  participants.forEach(p => {
    balance[p.id] = 0
  })

  // 各支払いの収支を計算
  payments.forEach(payment => {
    const { payerId, amountInJPY, splitAmong, customSplits } = payment
    if (splitAmong.length === 0) return

    balance[payerId] = (balance[payerId] ?? 0) + amountInJPY

    if (customSplits && Object.keys(customSplits).length > 0) {
      // 個別調整あり
      Object.entries(customSplits).forEach(([id, amount]) => {
        balance[id] = (balance[id] ?? 0) - amount
      })
    } else {
      // 均等割り
      const share = Math.round(amountInJPY / splitAmong.length)
      splitAmong.forEach(id => {
        balance[id] = (balance[id] ?? 0) - share
      })
    }
  })

  // 収支の正負リスト（正=受け取る、負=支払う）
  const creditors: { id: string; amount: number }[] = []
  const debtors: { id: string; amount: number }[] = []

  Object.entries(balance).forEach(([id, amount]) => {
    if (amount > 1) creditors.push({ id, amount })
    else if (amount < -1) debtors.push({ id, amount: -amount })
  })

  // 貪欲法で最小送金を計算
  const settlements: Settlement[] = []

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.amount, debtor.amount)

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount),
    })

    creditor.amount -= amount
    debtor.amount -= amount

    if (creditor.amount < 1) ci++
    if (debtor.amount < 1) di++
  }

  return settlements
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function generateId(): string {
  return crypto.randomUUID()
}

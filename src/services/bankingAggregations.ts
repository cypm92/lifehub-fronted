import type { BankMovement, MovementAccount } from './api'

export interface MovementFilters {
  text?: string
  accountId?: number | null
  direction?: 'all' | 'DBIT' | 'CRDT'
  excludeInternal?: boolean
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-ES').trim()
const dateString = (date: Date) => date.toISOString().slice(0, 10)
const parseDate = (value: string) => new Date(`${value}T00:00:00Z`)
const shiftDays = (value: string, days: number) => {
  const date = parseDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return dateString(date)
}
const monday = (value: string) => shiftDays(value, -((parseDate(value).getUTCDay() + 6) % 7))
const monetary = (movement: BankMovement, currency: string) =>
  movement.currency === currency && movement.amount !== null && Number.isFinite(movement.amount) ? movement.amount : 0

export function filterMovements(movements: readonly BankMovement[], filters: MovementFilters): BankMovement[] {
  const text = normalize(filters.text ?? '')
  return movements.filter((movement) => {
    if (filters.excludeInternal && movement.is_internal_transfer) return false
    if (filters.accountId != null && movement.account_id !== filters.accountId) return false
    if (filters.direction && filters.direction !== 'all' && movement.direction !== filters.direction) return false
    return !text || normalize([movement.counterparty, movement.concept, movement.bank_name, movement.account_name, movement.account_type].filter(Boolean).join(' ')).includes(text)
  })
}

// No se suman monedas distintas: todos los importes de una agregación son de la divisa indicada.
export function calculateKpis(movements: readonly BankMovement[], accounts: readonly MovementAccount[], currency = 'EUR') {
  let expenses = 0
  let income = 0
  for (const movement of movements) {
    const amount = monetary(movement, currency)
    if (amount < 0) expenses -= amount
    else income += amount
  }
  const balances = accounts.map((account) => account.balance).filter((balance): balance is NonNullable<MovementAccount['balance']> => balance !== null && balance.currency === currency)
  return { expenses, income, net: income - expenses, count: movements.length,
    balance: balances.length ? balances.reduce((sum, item) => sum + item.amount, 0) : null,
    balanceAvailableAccounts: balances.length, balanceTotalAccounts: accounts.length, currency }
}

export interface SeriesPoint { date: string; expenses: number; income: number; cumulativeNet: number }
export function temporalSeries(movements: readonly BankMovement[], start: string, end: string, interval: 'day' | 'week', currency = 'EUR'): SeriesPoint[] {
  if (start > end) return []
  const totals = new Map<string, { expenses: number; income: number }>()
  for (const movement of movements) {
    if (movement.date < start || movement.date > end) continue
    const key = interval === 'week' ? monday(movement.date) : movement.date
    const row = totals.get(key) ?? { expenses: 0, income: 0 }
    const amount = monetary(movement, currency)
    if (amount < 0) row.expenses -= amount
    else row.income += amount
    totals.set(key, row)
  }
  const result: SeriesPoint[] = []
  let cumulativeNet = 0
  for (let day = interval === 'week' ? monday(start) : start; day <= end; day = shiftDays(day, interval === 'week' ? 7 : 1)) {
    const row = totals.get(day) ?? { expenses: 0, income: 0 }
    cumulativeNet += row.income - row.expenses
    result.push({ date: day, ...row, cumulativeNet })
  }
  return result
}

export interface CalendarDay { date: string; inMonth: boolean; inPeriod: boolean; expenses: number; count: number; movements: BankMovement[] }
export function monthlyCalendar(movements: readonly BankMovement[], month: string, start: string, end: string, currency = 'EUR'): CalendarDay[][] {
  const first = `${month}-01`
  const firstDate = parseDate(first)
  const lastDate = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0))
  const last = dateString(lastDate)
  const gridStart = monday(first)
  const gridEnd = shiftDays(monday(last), 6)
  const grouped = new Map<string, BankMovement[]>()
  for (const movement of movements) {
    if (movement.date < start || movement.date > end) continue
    const rows = grouped.get(movement.date) ?? []
    rows.push(movement)
    grouped.set(movement.date, rows)
  }
  const weeks: CalendarDay[][] = []
  for (let day = gridStart; day <= gridEnd; day = shiftDays(day, 1)) {
    if ((weeks.at(-1)?.length ?? 7) === 7) weeks.push([])
    const rows = grouped.get(day) ?? []
    weeks.at(-1)!.push({ date: day, inMonth: day.slice(0, 7) === month, inPeriod: day >= start && day <= end,
      expenses: rows.reduce((sum, item) => sum + Math.max(0, -monetary(item, currency)), 0), count: rows.length, movements: rows })
  }
  return weeks
}

export function topCounterparties(movements: readonly BankMovement[], limit = 10, currency = 'EUR') {
  const totals = new Map<string, { name: string; amount: number; count: number }>()
  for (const movement of movements) {
    const amount = monetary(movement, currency)
    if (amount >= 0) continue
    const name = (movement.counterparty || movement.concept || 'Sin contraparte').trim().replace(/\s+/g, ' ')
    const key = normalize(name)
    const row = totals.get(key) ?? { name, amount: 0, count: 0 }
    row.amount -= amount
    row.count++
    totals.set(key, row)
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'es')).slice(0, Math.max(0, limit))
}

export function groupMovementsByDay(movements: readonly BankMovement[]) {
  const groups = new Map<string, BankMovement[]>()
  for (const movement of movements) {
    const rows = groups.get(movement.date) ?? []
    rows.push(movement)
    groups.set(movement.date, rows)
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, rows]) => ({
    date, movements: [...rows].sort((a, b) => b.id - a.id),
  }))
}

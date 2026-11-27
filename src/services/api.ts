import axios from 'axios'

const api = axios.create({
  // En Docker se usa /api y Vite lo redirige al contenedor backend. Fuera de
  // Docker se mantiene la URL local habitual para el flujo de desarrollo.
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
})

// Interceptor: añade automáticamente el token Bearer a cada petición si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface MovementAssignment {
  id: number
  transaction_id: number
  destination_type: 'fixed' | 'weekly' | 'extra' | 'income'
  destination_id: number | null
}

export interface BankMovement {
  id: number
  date: string
  amount: number | null
  currency: string | null
  direction: string | null
  status: string | null
  counterparty: string | null
  concept: string
  account_id: number
  account_name: string | null
  account_type: string | null
  connection_id: number
  bank_name: string
  is_internal_transfer: boolean
  assignment: MovementAssignment | null
}

export interface MovementAccount {
  id: number
  connection_id: number
  bank_name: string
  name: string | null
  type: string | null
  currency: string | null
  balance: { amount: number; currency: string | null } | null
}

export interface MovementsResponse {
  movements: BankMovement[]
  accounts: MovementAccount[]
}

export async function getBankMovements(days = 90, connectionId: number | null = null): Promise<MovementsResponse> {
  const { data } = await api.get<MovementsResponse>('/banks/movements', {
    params: { days, connection_id: connectionId ?? undefined },
  })
  return data
}

export default api

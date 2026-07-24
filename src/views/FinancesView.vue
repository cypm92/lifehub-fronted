<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '../services/api'

// Importar los nuevos subcomponentes
import WeeklyControlTab from '../components/finance/WeeklyControlTab.vue'
import GlobalBudgetTab from '../components/finance/GlobalBudgetTab.vue'
import FixedExpensesPanel from '../components/finance/FixedExpensesPanel.vue'
import ExtrasTab from '../components/finance/ExtrasTab.vue'
import SavingsTab from '../components/finance/SavingsTab.vue'

// --- INTERFACES ---
interface User {
  id: number
  name: string
  email: string
  role: string
}

interface Category {
  id: number
  name: string
  icon: string
  color: string
  type: string
}

interface CategorySummary {
  category: Category
  planned_amount: number
  actual_spent: number
  percentage_used: number
}

interface MonthlyBudgetSummary {
  month_code: string
  expected_income: number
  actual_income: number
  total_planned_expense: number
  total_actual_expense: number
  items: CategorySummary[]
}

interface Transaction {
  id: number
  concept: string
  amount: number
  type: string
  month_code: string
  date: string
  category?: Category
  user?: User
}

interface WeeklyExpense {
  id: number
  month_code: string
  week_number: number
  week_date_label: string
  category_name: string
  allocated_amount: number
  status: 'Pagado' | 'Parado' | 'Esperando'
}

interface FixedExpense {
  id: number
  fixed_expense_id: number
  concept: string
  amount: number
  description: string
  due_day: number
  due_date: string
  status: 'Esperando' | 'Pagado'
  end_date?: string | null
  installments_total?: number | null
  installments_paid: number
  installments_pending?: number | null
  installments_percentage?: number | null
  group_id?: number | null
  group_name?: string | null
  group_color?: string | null
}

interface ExtraExpense {
  id: number
  concept: string
  description: string
  amount: number
  expense_date: string
  status: 'Pagado' | 'Pendiente'
  category_id?: number | null
  category_name?: string | null
  category_color?: string | null
}

// --- ESTADOS ---
const activeTab = ref<'semanal' | 'resumen' | 'fijos' | 'extras' | 'ahorros'>('resumen')
const getInitialMonth = () => new Date().toISOString().slice(0, 7)
const currentMonth = ref<string>(getInitialMonth())

const users = ref<User[]>([])
const categories = ref<Category[]>([])
const transactions = ref<Transaction[]>([])
const summary = ref<MonthlyBudgetSummary | null>(null)
const weeklyExpenses = ref<WeeklyExpense[]>([])
const fixedExpenses = ref<FixedExpense[]>([])
const extraExpenses = ref<ExtraExpense[]>([])
const savingsSources = ref<any[]>([])

// --- FECHAS ---
const formattedMonthName = computed(() => {
  const parts = currentMonth.value.split('-')
  const yearStr = parts[0] ?? '2026'
  const monthStr = parts[1] ?? '01'
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1)
  const name = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const changeMonth = (offset: number) => {
  const parts = currentMonth.value.split('-').map(Number)
  const year = parts[0] ?? new Date().getFullYear()
  const month = parts[1] ?? 1
  const date = new Date(year, month - 1 + offset, 1)
  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// --- CARGA DE DATOS ---
const loadData = async () => {
  try {
    await loadFixedExpenses()
    await loadExtraExpenses()
    savingsSources.value = (await api.get('/savings-sources')).data

    const resSummary = await api.get(`/budgets/summary/${currentMonth.value}`)
    summary.value = resSummary.data

    const resTrans = await api.get(`/transactions/${currentMonth.value}`)
    transactions.value = resTrans.data

    const resCat = await api.get('/categories')
    categories.value = resCat.data

    try {
      const resUsers = await api.get('/users')
      users.value = resUsers.data
    } catch {
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (loggedUser?.id) users.value = [loggedUser]
    }

    await loadWeeklyExpenses()
  } catch (error) {
    console.error('Error cargando los datos financieros:', error)
  }
}

const loadFixedExpenses = async () => {
  try {
    const res = await api.get(`/fixed-expenses/${currentMonth.value}`)
    fixedExpenses.value = res.data
  } catch (error) {
    console.error('Error cargando los gastos fijos:', error)
  }
}

const loadWeeklyExpenses = async () => {
  try {
    const res = await api.get(`/weekly-expenses/${currentMonth.value}`)
    weeklyExpenses.value = res.data
  } catch (error) {
    console.error('Error cargando gastos semanales:', error)
  }
}

const toggleWeeklyStatus = async (item: WeeklyExpense) => {
  const nextStatusMap: Record<string, 'Pagado' | 'Parado' | 'Esperando'> = {
    'Esperando': 'Pagado',
    'Pagado': 'Parado',
    'Parado': 'Esperando'
  }
  const newStatus = nextStatusMap[item.status] || 'Esperando'

  try {
    await api.patch(`/weekly-expenses/${item.id}`, { status: newStatus })
    item.status = newStatus
  } catch {
    alert('Error al actualizar el estado semanal')
  }
}

const loadExtraExpenses = async () => {
  try {
    const res = await api.get(`/extra-expenses/${currentMonth.value}`)
    extraExpenses.value = res.data
  } catch (error) {
    console.error('Error cargando gastos extra:', error)
  }
}

const updateWeeklyAmount = async (item: WeeklyExpense, allocated_amount: number) => {
  try {
    await api.patch(`/weekly-expenses/${item.id}`, { allocated_amount })
    item.allocated_amount = allocated_amount
  } catch {
    alert('Error al actualizar el presupuesto semanal')
  }
}

watch(currentMonth, () => { loadData() })

// --- ACCIONES DE PRESUPUESTO ---
const saveBudgetItem = async (category_id: number, planned_amount: number) => {
  try {
    await api.post(`/budgets/set-item?month_code=${currentMonth.value}`, { category_id, planned_amount })
    await loadData()
  } catch {
    alert('Error al guardar el límite de la categoría')
  }
}

const clonePreviousMonth = async () => {
  const parts = currentMonth.value.split('-').map(Number)
  const prevDate = new Date(parts[0]!, parts[1]! - 2, 1)
  const fromMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  if (confirm(`¿Copiar la plantilla de ${fromMonth} a ${currentMonth.value}?`)) {
    try {
      await api.post('/budgets/clone', { from_month: fromMonth, to_month: currentMonth.value })
      await loadData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al clonar el presupuesto')
    }
  }
}

const createTransaction = async (txData: any) => {
  try {
    await api.post('/transactions', { ...txData, month_code: currentMonth.value })
    await loadData()
  } catch (error: any) {
    alert(error.response?.data?.detail || 'Error al registrar el movimiento')
  }
}

const updateIncome = async (id: number, txData: { concept: string; amount: number }) => {
  try {
    await api.put(`/transactions/${id}`, txData)
    await loadData()
  } catch (error: any) {
    alert(error.response?.data?.detail || 'Error al actualizar el ingreso')
  }
}

const deleteIncome = async (id: number) => {
  try {
    await api.delete(`/transactions/${id}`)
    await loadData()
  } catch (error: any) {
    alert(error.response?.data?.detail || 'Error al eliminar el ingreso')
  }
}

onMounted(() => { loadData() })
</script>

<template>
  <div class="dashboard">
    <!-- HEADER -->
    <header class="top-bar">
      <div class="month-selector">
        <button @click="changeMonth(-1)" class="btn-nav">‹</button>
        <h2>{{ formattedMonthName }}</h2>
        <button @click="changeMonth(1)" class="btn-nav">›</button>
      </div>

      <nav class="tabs-nav">
        <button :class="['tab-btn', { active: activeTab === 'resumen' }]" @click="activeTab = 'resumen'">📊 Presupuesto Global</button>
        <button :class="['tab-btn', { active: activeTab === 'fijos' }]" @click="activeTab = 'fijos'">📌 Gastos Fijos</button>
        <button :class="['tab-btn', { active: activeTab === 'semanal' }]" @click="activeTab = 'semanal'">📅 Control Semanal</button>
        <button :class="['tab-btn', { active: activeTab === 'extras' }]" @click="activeTab = 'extras'">🛒 Extras y Compras</button>
        <button :class="['tab-btn', { active: activeTab === 'ahorros' }]" @click="activeTab = 'ahorros'">💰 Ahorros</button>
      </nav>

      <div class="top-actions">
        <button @click="clonePreviousMonth" class="btn-secondary">📋 Copiar Mes Anterior</button>
      </div>
    </header>

    <!-- VISTAS / PESTAÑAS -->
    <WeeklyControlTab
        v-if="activeTab === 'semanal'"
        :weekly-expenses="weeklyExpenses"
        :month-code="currentMonth"
        @toggle-status="toggleWeeklyStatus"
        @update-amount="updateWeeklyAmount"
        @refresh="loadData"
    />

    <GlobalBudgetTab
        v-if="activeTab === 'resumen'"
        :summary="summary"
        :transactions="transactions"
        :categories="categories"
        :formatted-month-name="formattedMonthName"
        :fixed-expenses="fixedExpenses"
        :weekly-expenses="weeklyExpenses"
        :extra-expenses="extraExpenses"
        :savings-sources="savingsSources"
        :month-code="currentMonth"
        @save-budget-item="saveBudgetItem"
        @create-transaction="createTransaction"
        @update-income="updateIncome"
        @delete-income="deleteIncome"
        @show-fixed-expenses="activeTab = 'fijos'"
        @show-weekly-control="activeTab = 'semanal'"
        @show-extra-expenses="activeTab = 'extras'"
        @show-savings="activeTab = 'ahorros'"
    />

    <FixedExpensesPanel
        v-if="activeTab === 'fijos'"
        :fixed-expenses="fixedExpenses"
        :month-code="currentMonth"
        @refresh="loadData"
    />

    <ExtrasTab v-if="activeTab === 'extras'" :month-code="currentMonth" @refresh="loadData" />
    <SavingsTab v-if="activeTab === 'ahorros'" @refresh="loadData" />
  </div>
</template>

<style scoped>
.dashboard {
  padding: 32px;
  background-color: var(--bg-app);
  min-height: 100vh;
  box-sizing: border-box;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 16px;
}

.month-selector h2 {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-main);
  min-width: 180px;
  text-align: center;
}

.btn-nav {
  background: white;
  border: 1.5px solid var(--border-color);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--border-color);
  padding: 10px 18px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.tabs-nav {
  display: flex;
  gap: 8px;
  background: white;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.tab-btn {
  background: none;
  border: none;
  padding: 8px 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--primary, #3b82f6);
  color: white;
}
</style>

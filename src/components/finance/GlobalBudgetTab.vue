<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FixedExpensesSummary from './FixedExpensesSummary.vue'
import WeeklyExpensesSummary from './WeeklyExpensesSummary.vue'
import ExtrasSummary from './ExtrasSummary.vue'

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
  week_number?: number
  weekly_category?: string
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

interface WeeklyExpense {
  id: number
  week_number: number
  week_date_label: string
  allocated_amount: number
  status: 'Pagado' | 'Parado' | 'Esperando'
}

interface ExtraExpense {
  id: number
  concept: string
  description: string
  amount: number
  expense_date: string
  status: 'Pagado' | 'Pendiente'
  category_name?: string | null
  category_color?: string | null
}
interface SavingsSource { id:number; name:string; source_type:string; balance:number }

const props = defineProps<{
  summary: MonthlyBudgetSummary | null
  transactions: Transaction[]
  categories: Category[]
  formattedMonthName: string
  fixedExpenses: FixedExpense[]
  weeklyExpenses: WeeklyExpense[]
  extraExpenses: ExtraExpense[]
  savingsSources: SavingsSource[]
  monthCode: string
}>()

const emit = defineEmits<{
  (e: 'saveBudgetItem', categoryId: number, amount: number): void
  (e: 'createTransaction', data: any): void
  (e: 'updateIncome', id: number, data: { concept: string; amount: number }): void
  (e: 'deleteIncome', id: number): void
  (e: 'showFixedExpenses'): void
  (e: 'showWeeklyControl'): void
  (e: 'showExtraExpenses'): void
  (e: 'showSavings'): void
}>()

const showIncomeForm = ref(false)
const incomeForm = ref({ concept: 'Nómina', amount: 0 })
const editingIncomeId = ref<number | null>(null)
const editingCategoryId = ref<number | null>(null)
const tempPlannedAmount = ref(0)

const WEEKS_LIST = [1, 2, 3, 4, 5]
const weeklyCategories = computed(() => props.categories.filter(category => category.type === 'gasto_semanal'))
const fixedPlanned = computed(() => props.fixedExpenses.reduce((total, expense) => total + expense.amount, 0))
const fixedPaid = computed(() => props.fixedExpenses
  .filter(expense => expense.status === 'Pagado')
  .reduce((total, expense) => total + expense.amount, 0))
const weeklyPlanned = computed(() => props.weeklyExpenses.reduce((total, expense) => total + expense.allocated_amount, 0))
const weeklyPaid = computed(() => props.weeklyExpenses
  .filter(expense => expense.status === 'Pagado')
  .reduce((total, expense) => total + expense.allocated_amount, 0))
const totalPlannedRecurring = computed(() => fixedPlanned.value + weeklyPlanned.value)
const extraPaid = computed(() => props.extraExpenses
  .filter(expense => expense.status === 'Pagado')
  .reduce((total, expense) => total + expense.amount, 0))
const extraPlanned = computed(() => props.extraExpenses.reduce((total, expense) => total + expense.amount, 0))
const totalPaidRecurring = computed(() => fixedPaid.value + weeklyPaid.value + extraPaid.value)
const availableIncome = computed(() => props.summary?.actual_income || props.summary?.expected_income || 0)
const projectedSavings = computed(() => availableIncome.value - totalPlannedRecurring.value)
const remainingThisMonth = computed(() => availableIncome.value - totalPaidRecurring.value)
const fixedPending = computed(() => fixedPlanned.value - fixedPaid.value)
const weeklyPending = computed(() => weeklyPlanned.value - weeklyPaid.value)
const extraPending = computed(() => extraPlanned.value - extraPaid.value)
const pendingPayments = computed(() => fixedPending.value + weeklyPending.value + extraPending.value)
const projectedMonthEndBalance = computed(() => remainingThisMonth.value - pendingPayments.value)
const incomeTransactions = computed(() => props.transactions.filter(transaction => transaction.type === 'ingreso'))
const savingsTotal = computed(() => props.savingsSources.reduce((total, source) => total + source.balance, 0))
const newTransaction = ref({
  concept: '',
  amount: 0,
  type: 'gasto_semanal',
  category_id: null as number | null,
  week_number: 1,
})

watch(weeklyCategories, (categories) => {
  if (!categories.some(category => category.id === newTransaction.value.category_id)) {
    newTransaction.value.category_id = categories[0]?.id ?? null
  }
}, { immediate: true })

const registerIncome = () => {
  emit('createTransaction', {
    concept: incomeForm.value.concept,
    amount: incomeForm.value.amount,
    type: 'ingreso',
    category_id: null,
  })
  incomeForm.value = { concept: 'Nómina', amount: 0 }
  showIncomeForm.value = false
}

const startEditIncome = (income: Transaction) => {
  editingIncomeId.value = income.id
  incomeForm.value = { concept: income.concept, amount: income.amount }
  showIncomeForm.value = true
}

const cancelIncomeForm = () => {
  editingIncomeId.value = null
  incomeForm.value = { concept: 'Nómina', amount: 0 }
  showIncomeForm.value = false
}

const saveIncome = () => {
  if (editingIncomeId.value !== null) {
    emit('updateIncome', editingIncomeId.value, { ...incomeForm.value })
  } else {
    registerIncome()
  }
  cancelIncomeForm()
}

const deleteIncome = (income: Transaction) => {
  if (confirm(`¿Eliminar el ingreso "${income.concept}"?`)) emit('deleteIncome', income.id)
}

const formatRecordedDate = (value: string) => new Date(value).toLocaleDateString('es-ES')

const startEditBudgetItem = (item: CategorySummary) => {
  editingCategoryId.value = item.category.id
  tempPlannedAmount.value = item.planned_amount
}

const saveBudgetItem = (categoryId: number) => {
  editingCategoryId.value = null
  emit('saveBudgetItem', categoryId, tempPlannedAmount.value)
}

const submitTransaction = () => {
  const payload: any = {
    concept: newTransaction.value.concept,
    amount: newTransaction.value.amount,
    type: newTransaction.value.type,
  }

  if (newTransaction.value.type === 'gasto_semanal') {
    payload.week_number = newTransaction.value.week_number
  }
  payload.category_id = newTransaction.value.category_id

  emit('createTransaction', payload)

  // Resetear formulario
  newTransaction.value.concept = ''
  newTransaction.value.amount = 0
  newTransaction.value.week_number = 1
  newTransaction.value.category_id = weeklyCategories.value[0]?.id ?? null
}

const getProgressClass = (pct: number) => {
  if (pct >= 100) return 'bar-danger'
  if (pct >= 75) return 'bar-warning'
  return 'bar-success'
}
</script>

<template>
  <div>
    <!-- METRICAS KPI -->
    <div class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-header">
          <span>Ingresos mes actual</span>
        </div>
        <div class="kpi-amount text-primary">{{ summary?.actual_income.toFixed(2) }} €</div>
        <div class="kpi-footer">
          <span class="kpi-subtext">Total registrado este mes</span>
        </div>
        <button class="btn-income" @click="showIncomeForm ? cancelIncomeForm() : (showIncomeForm = true)">{{ showIncomeForm ? 'Cancelar' : '+ Registrar ingreso' }}</button>
        <form v-if="showIncomeForm" class="income-form" @submit.prevent="saveIncome">
          <input v-model.trim="incomeForm.concept" required maxlength="120" placeholder="Ej.: Nómina de julio" />
          <input v-model.number="incomeForm.amount" required min="0.01" step="0.01" type="number" placeholder="Importe (€)" />
          <button class="btn-primary btn-sm" type="submit">{{ editingIncomeId === null ? 'Guardar' : 'Actualizar' }}</button>
        </form>
        <div v-if="incomeTransactions.length" class="income-history">
          <div v-for="income in incomeTransactions" :key="income.id" class="income-row">
            <span class="income-details"><span class="income-date">{{ formatRecordedDate(income.date) }}</span><strong>{{ income.concept }}</strong><span>+{{ income.amount.toFixed(2) }} €</span></span>
            <span class="income-actions"><button type="button" class="btn-link" @click="startEditIncome(income)">Editar</button><button type="button" class="btn-link danger" @click="deleteIncome(income)">Eliminar</button></span>
          </div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-header"><span>Ahorros actuales</span><span class="currency-tag">EUR</span></div>
        <div class="kpi-amount text-primary">{{ savingsTotal.toFixed(2) }} €</div>
        <div class="savings-list">
          <div v-for="source in savingsSources" :key="source.id" class="savings-item">
            <span>{{ source.name }} · {{ source.source_type }}</span><strong>{{ source.balance.toFixed(2) }} €</strong>
          </div>
          <span v-if="!savingsSources.length" class="kpi-subtext">Sin fuentes de ahorro configuradas.</span>
        </div>
        <button class="savings-link" @click="emit('showSavings')">Gestionar ahorros →</button>
      </div>

      <div class="card kpi-card">
        <div class="kpi-header">
          <span>Gastos mes actual</span>
          <span class="currency-tag">EUR</span>
        </div>
        <div class="budget-total"><div class="kpi-amount" :class="totalPaidRecurring > totalPlannedRecurring ? 'text-danger' : 'text-success'">{{ totalPaidRecurring.toFixed(2) }} €</div><span class="kpi-subtext">Pagado actualmente</span></div>
        <div class="kpi-breakdown planned-breakdown">
          <div><span>Fijos presupuestados</span><strong>{{ fixedPlanned.toFixed(2) }} €</strong></div>
          <div><span>Semanales presupuestados</span><strong>{{ weeklyPlanned.toFixed(2) }} €</strong></div>
          <div><span>Extras presupuestados</span><strong>{{ extraPlanned.toFixed(2) }} €</strong></div>
        </div>
        <div class="kpi-breakdown">
          <div><span>Fijos pagados</span><strong>{{ fixedPaid.toFixed(2) }} €</strong></div>
          <div><span>Semanales pagados</span><strong>{{ weeklyPaid.toFixed(2) }} €</strong></div>
          <div><span>Extras pagados</span><strong>{{ extraPaid.toFixed(2) }} €</strong></div>
        </div>
      </div>

      <div class="card kpi-card">
        <div class="kpi-header">
          <span>Saldo Disponible</span>
        </div>
        <div class="kpi-amount" :class="remainingThisMonth >= 0 ? 'text-success' : 'text-danger'">
          {{ remainingThisMonth.toFixed(2) }} €
        </div>
        <div class="kpi-breakdown">
          <div><span>Ingresos</span><strong>{{ availableIncome.toFixed(2) }} €</strong></div>
          <div><span>Pagado</span><strong>{{ totalPaidRecurring.toFixed(2) }} €</strong></div>
          <div><span>Pendiente</span><strong :class="pendingPayments > 0 ? 'text-warning' : 'text-success'">{{ pendingPayments.toFixed(2) }} €</strong></div>
        </div>
        <div class="pending-detail">Pendiente: Fijos {{ fixedPending.toFixed(2) }} € · Semanales {{ weeklyPending.toFixed(2) }} € · Extras {{ extraPending.toFixed(2) }} €</div>
        <div class="balance-projection"><span>Saldo al cerrar el mes</span><strong :class="projectedMonthEndBalance >= 0 ? 'text-success' : 'text-danger'">{{ projectedMonthEndBalance.toFixed(2) }} €</strong></div>
      </div>
    </div>

    <FixedExpensesSummary
      :fixed-expenses="fixedExpenses"
      :month-code="monthCode"
      @view-all="emit('showFixedExpenses')"
    />

    <WeeklyExpensesSummary
      :weekly-expenses="weeklyExpenses"
      @view-all="emit('showWeeklyControl')"
    />

    <ExtrasSummary
      :expenses="extraExpenses"
      :month-code="monthCode"
      @view-all="emit('showExtraExpenses')"
    />

    <!-- GRID PRINCIPAL -->
    <div v-if="false" class="main-grid">
      <div class="card budget-categories-card">
        <div class="card-header">
          <h3>Presupuesto por Categorías</h3>
          <span class="subtitle-sm">Presupuestado vs Gastado</span>
        </div>

        <div class="categories-list">
          <div v-for="item in summary?.items" :key="item.category.id" class="category-item">
            <div class="cat-info">
              <div class="cat-name">
                <span class="cat-icon">{{ item.category.icon }}</span>
                <strong>{{ item.category.name }}</strong>
              </div>

              <div class="cat-amounts">
                <span>{{ item.actual_spent.toFixed(2) }} €</span>
                <span class="separator">/</span>
                <div v-if="editingCategoryId !== item.category.id" @click="startEditBudgetItem(item)" class="planned-tag">
                  {{ item.planned_amount.toFixed(2) }} € ✏️
                </div>
                <div v-else class="inline-edit">
                  <input v-model.number="tempPlannedAmount" type="number" class="input input-xs" />
                  <button @click="saveBudgetItem(item.category.id)" class="btn-primary btn-xs">✓</button>
                </div>
              </div>
            </div>

            <div class="progress-bar-container">
              <div
                  class="progress-bar-fill"
                  :class="getProgressClass(item.percentage_used)"
                  :style="{ width: Math.min(item.percentage_used, 100) + '%' }"
              ></div>
            </div>
            <div class="pct-text">{{ item.percentage_used }}% consumido</div>
          </div>
        </div>
      </div>

      <div class="right-stack">
        <div class="card">
          <h3>Registrar Movimiento en {{ formattedMonthName }}</h3>
          <form @submit.prevent="submitTransaction" class="form-stack">
            <!-- Concepto e Importe -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>Concepto</label>
                <input v-model="newTransaction.concept" class="input" placeholder="Ej: Compra Mercadona" required />
              </div>
              <div class="form-group width-140">
                <label>Importe (€)</label>
                <input v-model.number="newTransaction.amount" type="number" step="0.01" class="input" required />
              </div>
            </div>

            <!-- Tipo de Movimiento (Seleccionado primero) -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>Tipo de Movimiento</label>
                <select v-model="newTransaction.type" class="input">
                  <option value="gasto_semanal">Gasto Semanal</option>
                  <option value="gasto_fijo">Gasto Fijo</option>
                  <option value="gasto_extra">Gasto Extra</option>
                  <option value="ingreso">Ingreso</option>
                </select>
              </div>
            </div>

            <!-- Comportamiento Condicional -->
            <!-- 1. Si es Gasto Semanal: Muestra selector de semana y las 3 categorías fijas -->
            <div v-if="newTransaction.type === 'gasto_semanal'" class="dynamic-box">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Seleccionar Semana</label>
                  <select v-model.number="newTransaction.week_number" class="input">
                    <option v-for="w in WEEKS_LIST" :key="w" :value="w">Semana {{ w }}</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label>Categoría Semanal</label>
                  <select v-model.number="newTransaction.category_id" class="input" required>
                    <option v-for="cat in weeklyCategories" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 2. Si NO es Gasto Semanal: Muestra todas las categorías generales -->
            <div v-else class="form-row">
              <div class="form-group flex-1">
                <label>Categoría</label>
                <select v-model="newTransaction.category_id" class="input" required>
                  <option v-for="c in categories" :key="c.id" :value="c.id">
                    {{ c.icon }} {{ c.name }}
                  </option>
                </select>
              </div>
            </div>

            <button type="submit" class="btn-primary width-full">+ Añadir Movimiento</button>
          </form>
        </div>

        <div class="card">
          <h3>Movimientos de {{ formattedMonthName }}</h3>
          <div class="table-container">
            <table class="clean-table">
              <thead>
              <tr>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Importe</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="t in transactions" :key="t.id">
                <td><strong>{{ t.concept }}</strong></td>
                <td>
                    <span v-if="t.category" class="cat-pill">
                      {{ t.category?.icon }} {{ t.category?.name }}
                    </span>
                  <span v-else class="type-pill">{{ t.type }}</span>
                </td>
                <td :class="t.type === 'ingreso' ? 'text-success' : 'text-danger'">
                  {{ t.type === 'ingreso' ? '+' : '-' }}{{ t.amount.toFixed(2) }} €
                </td>
              </tr>
              <tr v-if="transactions.length === 0">
                <td colspan="3" class="text-center text-muted">No hay movimientos registrados este mes.</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
}

.kpi-amount {
  font-size: 2.1rem;
  font-weight: 800;
  margin: 12px 0;
}

.kpi-footer {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.kpi-card:nth-child(2) { order: 4; }
.kpi-card:nth-child(3) { order: 2; }
.kpi-card:nth-child(4) { order: 3; }

.kpi-breakdown {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 8px;
}

.kpi-breakdown div { display: flex; flex-direction: column; gap: 2px; }
.kpi-breakdown span { color: var(--text-muted); font-size: 0.72rem; }
.kpi-breakdown strong { font-size: 0.82rem; }
.planned-breakdown { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border-color); }

.budget-total { display: flex; align-items: baseline; gap: 8px; }
.budget-total .kpi-amount { margin: 12px 0; }

.balance-projection { display:flex; justify-content:space-between; margin-top:12px; padding-top:8px; border-top:1px solid var(--border-color); font-size:.78rem; }
.balance-projection span { color:var(--text-muted); }
.pending-detail { margin-top:9px; color:var(--text-muted); font-size:.72rem; line-height:1.35; }

.btn-income {
  margin-top: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
}

.income-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px auto;
  gap: 6px;
  margin-top: 10px;
}

.income-form input {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font: inherit;
  font-size: 0.8rem;
}

.income-history {
  display: flex;
  flex-direction: column;
  margin-top: 9px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  overflow: hidden;
  font-size: 0.77rem;
}

.income-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 9px 11px;
  border-bottom: 1px solid var(--border-color);
}

.income-row:last-child {
  border-bottom: 0;
}

.income-details {
  display: flex;
  gap: 5px;
  align-items: baseline;
  min-width: 0;
  color: var(--text-muted);
}

.income-details strong {
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.income-date {
  flex-shrink: 0;
}

.income-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.income-actions .btn-link {
  border: 0;
  padding: 0;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font: inherit;
  font-weight: 650;
}

.income-actions .danger {
  color: #dc2626;
}

.savings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  font-size: 0.78rem;
}

.savings-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-muted);
}

.savings-item strong {
  color: var(--text-main);
  white-space: nowrap;
}

.savings-link {
  display: block;
  margin: 10px 0 0 auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
}

.fixed-expenses-card {
  margin-bottom: 28px;
}

.fixed-expenses-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.fixed-expenses-header h3 {
  margin: 0 0 4px;
}

.fixed-status {
  color: #166534;
  background: #dcfce7;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.fixed-expenses-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.fixed-expenses-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border-right: 1px solid var(--border-color);
}

.fixed-expenses-metrics > div:last-child {
  border-right: none;
}

.fixed-expenses-metrics span {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.fixed-expenses-metrics strong {
  font-size: 1.15rem;
}

.fixed-expenses-list {
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
}

.fixed-expense-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) minmax(120px, 0.5fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border-color);
}

.expense-check {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  color: #166534;
  background: #dcfce7;
  border-radius: 50%;
  font-size: 0.78rem;
  font-weight: 800;
}

.expense-concept {
  font-weight: 650;
}

.expense-category,
.fixed-empty-state {
  color: var(--text-muted);
  font-size: 0.88rem;
}

.fixed-empty-state {
  margin: 16px 0 0;
}

@media (max-width: 640px) {
  .fixed-expenses-header {
    flex-direction: column;
  }

  .fixed-expenses-metrics {
    grid-template-columns: 1fr;
  }

  .fixed-expenses-metrics > div {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .fixed-expenses-metrics > div:last-child {
    border-bottom: none;
  }

  .fixed-expense-row {
    grid-template-columns: 24px 1fr auto;
  }

  .expense-category {
    grid-column: 2 / 3;
  }
}

.currency-tag {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 24px;
}

.right-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-header {
  margin-bottom: 20px;
}

.subtitle-sm {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.cat-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cat-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.cat-icon {
  font-size: 1.1rem;
}

.cat-amounts {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.separator { color: var(--text-muted); }

.planned-tag {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-muted);
}

.planned-tag:hover {
  background: #e2e8f0;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.4s ease;
}

.bar-success { background: #22c55e; }
.bar-warning { background: #f59e0b; }
.bar-danger  { background: #ef4444; }

.pct-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 15px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 { flex: 1; }
.width-140 { width: 140px; }
.width-full { width: 100%; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.dynamic-box {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
}

.cat-pill {
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
}

.type-pill {
  background: #e2e8f0;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.82rem;
}

.table-container {
  max-height: 350px;
  overflow-y: auto;
}

.clean-table {
  width: 100%;
  border-collapse: collapse;
}

.clean-table th {
  text-align: left;
  padding: 10px 12px;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border-color);
}

.clean-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.text-center { text-align: center; }
.text-success { color: #16a34a; font-weight: 700; }
.text-danger { color: #dc2626; font-weight: 700; }
.text-primary { color: var(--primary, #3b82f6); }
.text-main { color: var(--text-main); }
.text-muted { color: var(--text-muted); }

.input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  background: white;
}

.input:focus {
  border-color: var(--primary, #3b82f6);
}

.btn-primary {
  background: var(--primary, #3b82f6);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.input-sm { padding: 6px 10px; font-size: 0.9rem; }
.btn-sm { padding: 6px 12px; font-size: 0.85rem; }
.input-xs { padding: 2px 6px; font-size: 0.8rem; width: 70px; }
.btn-xs { padding: 2px 8px; font-size: 0.8rem; border-radius: 6px; }
.inline-edit { display: flex; gap: 4px; align-items: center; }
</style>

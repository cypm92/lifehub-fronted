<script setup lang="ts">
import { computed, ref } from 'vue'
import api from '../../services/api'
import FixedExpensesSummary from './FixedExpensesSummary.vue'

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

interface FixedExpenseGroup {
  id: number
  name: string
  color: string
}

const props = defineProps<{
  fixedExpenses: FixedExpense[]
  monthCode: string
}>()

const emit = defineEmits<{ (e: 'refresh'): void }>()
const isManagerOpen = ref(false)
const isGroupManagerOpen = ref(false)
const editingId = ref<number | null>(null)
const isInstallmentExpense = ref(false)
const form = ref({
  concept: '',
  amount: 0,
  description: '',
  due_day: 1,
  end_date: '',
  installments_total: null as number | null,
  installments_paid: 0,
  group_id: null as number | null,
})
const groups = ref<FixedExpenseGroup[]>([])
const editingGroupId = ref<number | null>(null)
const groupForm = ref({ name: '', color: '#7c3aed' })

const groupedExpenses = computed(() => {
  const buckets = new Map<
    string,
    { id: number | null; name: string; color: string; expenses: FixedExpense[] }
  >()
  props.fixedExpenses.forEach((expense) => {
    const key = expense.group_id?.toString() ?? 'none'
    if (!buckets.has(key))
      buckets.set(key, {
        id: expense.group_id ?? null,
        name: expense.group_name || 'Sin categoría',
        color: expense.group_color || '#94a3b8',
        expenses: [],
      })
    buckets.get(key)!.expenses.push(expense)
  })
  return [...buckets.values()]
})

const loadGroups = async () => {
  const response = await api.get('/fixed-expense-groups')
  groups.value = response.data
}

const resetForm = () => {
  editingId.value = null
  isInstallmentExpense.value = false
  form.value = {
    concept: '',
    amount: 0,
    description: '',
    due_day: 1,
    end_date: '',
    installments_total: null,
    installments_paid: 0,
    group_id: null,
  }
}

const openCreate = async () => {
  resetForm()
  await loadGroups()
  isManagerOpen.value = true
}

const openGroupManager = async () => {
  isGroupManagerOpen.value = true
  await loadGroups()
}

const openEdit = async (expense: FixedExpense) => {
  editingId.value = expense.fixed_expense_id
  isInstallmentExpense.value = expense.installments_total != null
  form.value = {
    concept: expense.concept,
    amount: expense.amount,
    description: expense.description,
    due_day: expense.due_day,
    end_date: expense.end_date || '',
    installments_total: expense.installments_total ?? null,
    installments_paid: expense.installments_paid,
    group_id: expense.group_id ?? null,
  }
  await loadGroups()
  isManagerOpen.value = true
}

const save = async () => {
  try {
    const payload = {
      ...form.value,
      end_date: form.value.end_date || null,
      installments_total: isInstallmentExpense.value ? form.value.installments_total : null,
      installments_paid: isInstallmentExpense.value ? form.value.installments_paid : 0,
    }
    if (editingId.value) {
      await api.patch(`/fixed-expenses/${editingId.value}?month_code=${props.monthCode}`, payload)
    } else {
      await api.post(`/fixed-expenses?month_code=${props.monthCode}`, payload)
    }
    isManagerOpen.value = false
    resetForm()
    emit('refresh')
  } catch {
    alert('No se pudo guardar el gasto fijo')
  }
}

const toggleStatus = async (expense: FixedExpense) => {
  const status = expense.status === 'Pagado' ? 'Esperando' : 'Pagado'
  try {
    await api.patch(`/fixed-expenses/monthly/${expense.id}`, { status })
    emit('refresh')
  } catch {
    alert('No se pudo actualizar el estado del pago')
  }
}

const remove = async (expense: FixedExpense) => {
  if (!confirm(`¿Eliminar "${expense.concept}" de los próximos meses?`)) return
  try {
    await api.delete(`/fixed-expenses/${expense.fixed_expense_id}?month_code=${props.monthCode}`)
    emit('refresh')
  } catch {
    alert('No se pudo eliminar el gasto fijo')
  }
}

const editGroup = (group: FixedExpenseGroup) => {
  editingGroupId.value = group.id
  groupForm.value = { name: group.name, color: group.color }
}

const resetGroupForm = () => {
  editingGroupId.value = null
  groupForm.value = { name: '', color: '#7c3aed' }
}

const saveGroup = async () => {
  try {
    if (editingGroupId.value)
      await api.patch(`/fixed-expense-groups/${editingGroupId.value}`, groupForm.value)
    else await api.post('/fixed-expense-groups', groupForm.value)
    await loadGroups()
    resetGroupForm()
    emit('refresh')
  } catch (error: any) {
    alert(error.response?.data?.detail || 'No se pudo guardar la categoría')
  }
}

const removeGroup = async (group: FixedExpenseGroup) => {
  if (!confirm(`¿Eliminar la categoría "${group.name}"? Sus gastos quedarán sin categoría.`)) return
  await api.delete(`/fixed-expense-groups/${group.id}`)
  await loadGroups()
  emit('refresh')
}
</script>

<template>
  <section class="card fixed-expenses-card">
    <div class="card-header fixed-expenses-header">
      <div>
        <h3>Gastos Fijos</h3>
        <span class="subtitle-sm">Pagos recurrentes de {{ monthCode }}</span>
      </div>
      <div class="header-actions">
        <button class="btn-secondary btn-sm" @click="openGroupManager">Gestionar categorías</button
        ><button class="btn-primary btn-sm" @click="openCreate">+ Añadir gasto</button>
      </div>
    </div>

    <FixedExpensesSummary :fixed-expenses="fixedExpenses" :month-code="monthCode" embedded />

    <div v-if="fixedExpenses.length" class="fixed-expenses-list">
      <section v-for="group in groupedExpenses" :key="group.name" class="expense-group">
        <div class="group-heading">
          <span class="group-dot" :style="{ backgroundColor: group.color }"></span
          ><strong>{{ group.name }}</strong
          ><span
            >{{
              group.expenses.reduce((total, expense) => total + expense.amount, 0).toFixed(2)
            }}
            €</span
          >
        </div>
        <div v-for="expense in group.expenses" :key="expense.id" class="fixed-expense-row">
          <button
            class="status-button"
            :class="expense.status.toLowerCase()"
            @click="toggleStatus(expense)"
          >
            {{ expense.status === 'Pagado' ? '✓ Pagado' : 'Pendiente' }}
          </button>
          <div>
            <strong>{{ expense.concept }}</strong>
            <span v-if="expense.description" class="expense-description">{{
              expense.description
            }}</span>
            <span v-if="expense.installments_total" class="installment-progress">
              Cuotas: {{ expense.installments_paid }}/{{ expense.installments_total }} pagadas ·
              {{ expense.installments_pending }} pendientes ({{ expense.installments_percentage }}%)
            </span>
          </div>
          <span class="expense-date"
            >Día {{ expense.due_day }} · {{ expense.due_date }}<br v-if="expense.end_date" />{{
              expense.end_date ? `Fin: ${expense.end_date}` : ''
            }}</span
          >
          <strong>{{ expense.amount.toFixed(2) }} €</strong>
          <div class="row-actions">
            <button class="btn-link" @click="openEdit(expense)">Editar</button>
            <button class="btn-link danger" @click="remove(expense)">Eliminar</button>
          </div>
        </div>
      </section>
    </div>
    <p v-else class="fixed-empty-state">
      Configura tus créditos, suscripciones y otros cargos recurrentes para crear automáticamente el
      presupuesto de cada mes.
    </p>
  </section>

  <div v-if="isManagerOpen" class="modal-backdrop" @click.self="isManagerOpen = false">
    <form class="modal" @submit.prevent="save">
      <div class="modal-header">
        <div>
          <h3>{{ editingId ? 'Editar gasto fijo' : 'Nuevo gasto fijo' }}</h3>
          <p>Se generará cada mes y aparecerá como próximo evento de pago.</p>
        </div>
        <button type="button" class="btn-close" @click="isManagerOpen = false">×</button>
      </div>
      <label
        >Concepto<input
          v-model.trim="form.concept"
          required
          maxlength="120"
          placeholder="Ej.: Crédito Revolut"
      /></label>
      <label
        >Categoría
        <select v-model.number="form.group_id">
          <option :value="null">Sin categoría</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </label>
      <div class="form-row">
        <label
          >Importe (€)<input
            v-model.number="form.amount"
            required
            min="0.01"
            step="0.01"
            type="number"
        /></label>
        <label
          >Día de cobro<input v-model.number="form.due_day" required min="1" max="31" type="number"
        /></label>
      </div>
      <label class="checkbox-label"
        ><input v-model="isInstallmentExpense" type="checkbox" /> Es un crédito o gasto por
        cuotas</label
      >
      <div v-if="isInstallmentExpense" class="installments-form">
        <div class="form-row">
          <label
            >Cuotas totales<input
              v-model.number="form.installments_total"
              required
              min="1"
              type="number"
          /></label>
          <label
            >Cuotas ya pagadas<input
              v-model.number="form.installments_paid"
              required
              min="0"
              :max="form.installments_total || undefined"
              type="number"
          /></label>
        </div>
        <label>Fecha prevista de fin (opcional)<input v-model="form.end_date" type="date" /></label>
      </div>
      <label
        >Descripción (opcional)<textarea
          v-model.trim="form.description"
          maxlength="500"
          placeholder="Ej.: Domiciliado el día 5"
        ></textarea>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="isManagerOpen = false">Cancelar</button
        ><button class="btn-primary" type="submit">Guardar</button>
      </div>
    </form>
  </div>

  <div v-if="isGroupManagerOpen" class="modal-backdrop" @click.self="isGroupManagerOpen = false">
    <form class="modal group-modal" @submit.prevent="saveGroup">
      <div class="modal-header">
        <div>
          <h3>Categorías de gastos fijos</h3>
          <p>Organiza tus créditos, suscripciones y cualquier otro grupo.</p>
        </div>
        <button type="button" class="btn-close" @click="isGroupManagerOpen = false">×</button>
      </div>
      <div v-if="groups.length" class="groups-list">
        <div v-for="group in groups" :key="group.id" class="group-manager-row">
          <span class="group-dot" :style="{ backgroundColor: group.color }"></span
          ><strong>{{ group.name }}</strong
          ><button type="button" class="btn-link" @click="editGroup(group)">Editar</button
          ><button type="button" class="btn-link danger" @click="removeGroup(group)">
            Eliminar
          </button>
        </div>
      </div>
      <label
        >Nombre de la categoría<input
          v-model.trim="groupForm.name"
          required
          maxlength="60"
          placeholder="Ej.: Créditos"
      /></label>
      <label
        >Color<input v-model="groupForm.color" class="color-input" required type="color"
      /></label>
      <div class="modal-actions">
        <button v-if="editingGroupId" type="button" class="btn-secondary" @click="resetGroupForm">
          Cancelar edición</button
        ><button class="btn-primary" type="submit">
          {{ editingGroupId ? 'Guardar categoría' : 'Crear categoría' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fixed-expenses-card {
  margin-bottom: 0;
  padding: 10px 14px;
}
.fixed-expenses-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 6px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.fixed-expenses-header h3 {
  margin: 0 0 1px;
  font-size: 1.05rem;
}
.fixed-expenses-card :deep(.fixed-summary.embedded) {
  margin-bottom: 6px;
}
.fixed-expenses-card :deep(.summary-metrics div) {
  padding: 5px 10px;
}
.fixed-expenses-card :deep(.summary-metrics span) {
  font-size: 0.74rem;
}
.fixed-expenses-card :deep(.summary-metrics strong) {
  font-size: 0.95rem;
}
.fixed-expenses-card :deep(.next-payments p) {
  margin-bottom: 2px;
  font-size: 0.74rem;
}
.fixed-expenses-card :deep(.next-item) {
  padding: 2px 0;
  font-size: 0.78rem;
}
.subtitle-sm,
.expense-description,
.expense-date,
.fixed-empty-state,
.modal-header p {
  color: var(--text-muted);
  font-size: 0.76rem;
}
.installment-progress {
  display: block;
  margin-top: 1px;
  color: #4f46e5;
  font-size: 0.72rem;
  font-weight: 650;
}
.fixed-expenses-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.fixed-expenses-metrics div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border-right: 1px solid var(--border-color);
}
.fixed-expenses-metrics div:last-child {
  border: 0;
}
.fixed-expenses-metrics span {
  color: var(--text-muted);
  font-size: 0.82rem;
}
.fixed-expenses-metrics strong {
  font-size: 1.15rem;
}
.fixed-expenses-list {
  margin-top: 4px;
  border-top: 1px solid var(--border-color);
}
.expense-group + .expense-group {
  margin-top: 4px;
}
.group-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
  padding: 4px;
  color: var(--text-main);
}
.group-heading span:last-child {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 650;
}
.group-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}
.fixed-expense-row {
  display: grid;
  grid-template-columns: 100px minmax(150px, 1fr) minmax(120px, 0.7fr) auto auto;
  gap: 8px;
  align-items: center;
  min-height: 28px;
  padding: 3px 4px;
  border-bottom: 1px solid var(--border-color);
}
.expense-description {
  display: block;
  margin-top: 1px;
}
.status-button {
  border: 0;
  border-radius: 999px;
  padding: 3px 7px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.7rem;
}
.status-button.pagado {
  color: #166534;
  background: #dcfce7;
}
.status-button.esperando {
  color: #92400e;
  background: #fef3c7;
}
.row-actions {
  display: flex;
  gap: 6px;
}
.btn-link {
  border: 0;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font-weight: 650;
  font-size: 0.78rem;
}
.danger {
  color: #dc2626;
}
.text-success {
  color: #16a34a;
}
.text-danger {
  color: #dc2626;
}
.fixed-empty-state {
  margin: 16px 0 0;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
}
.modal {
  width: min(100%, 520px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.modal-header h3,
.modal-header p {
  margin: 0;
}
.modal-header p {
  margin-top: 4px;
}
.btn-close {
  border: 0;
  background: none;
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 650;
  color: var(--text-main);
}
input,
textarea,
select {
  padding: 9px 11px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font: inherit;
  background: white;
}
textarea {
  min-height: 72px;
  resize: vertical;
}
.checkbox-label {
  flex-direction: row;
  align-items: center;
}
.checkbox-label input {
  width: 16px;
  height: 16px;
}
.installments-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 9px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-primary,
.btn-secondary {
  border: 0;
  border-radius: 8px;
  padding: 9px 14px;
  cursor: pointer;
  font-weight: 650;
}
.btn-primary {
  background: var(--primary);
  color: white;
}
.btn-secondary {
  background: #e2e8f0;
  color: var(--text-main);
}
.btn-sm {
  padding: 6px 10px;
  font-size: 0.78rem;
}
.groups-list {
  border: 1px solid var(--border-color);
  border-radius: 9px;
  overflow: hidden;
}
.group-manager-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}
.group-manager-row:last-child {
  border-bottom: 0;
}
.group-manager-row .btn-link:first-of-type {
  margin-left: auto;
}
.color-input {
  min-height: 40px;
  padding: 4px;
}
@media (max-width: 760px) {
  .fixed-expenses-metrics {
    grid-template-columns: 1fr;
  }
  .fixed-expenses-metrics div {
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }
  .fixed-expenses-metrics div:last-child {
    border-bottom: 0;
  }
  .fixed-expense-row {
    grid-template-columns: 1fr auto;
  }
  .expense-date {
    grid-column: 1 / 2;
  }
  .row-actions {
    justify-self: end;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

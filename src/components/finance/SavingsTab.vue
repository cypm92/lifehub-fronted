<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'

type LoanDirection = 'Recibido' | 'Concedido'

interface LoanPayment {
  id: number
  amount: number
  payment_date: string
  note: string
}

interface Source {
  id: number
  name: string
  source_type: string
  balance: number
  loan_direction?: LoanDirection | null
  loan_total?: number | null
  loan_paid: number
  loan_remaining: number
}

const emit = defineEmits<{ (e: 'refresh'): void }>()
const sources = ref<Source[]>([])
const editing = ref<number | null>(null)
const sourceFormOpen = ref(false)
const selectedLoan = ref<Source | null>(null)
const payments = ref<LoanPayment[]>([])
const error = ref('')
const form = ref({
  name: '',
  source_type: 'Banco',
  balance: 0,
  loan_direction: '' as LoanDirection | '',
  loan_total: 0,
})
const paymentForm = ref({ amount: 0, payment_date: new Date().toISOString().slice(0, 10), note: '' })
const savedBalance = computed(() =>
  sources.value
    .filter((source) => source.source_type !== 'Prestamo Familiar')
    .reduce((sum, source) => sum + source.balance, 0),
)
const loanedOut = computed(() =>
  sources.value
    .filter((source) => source.source_type === 'Prestamo Familiar' && source.loan_direction === 'Concedido')
    .reduce((sum, source) => sum + source.loan_remaining, 0),
)
const receivedPending = computed(() =>
  sources.value
    .filter((source) => source.source_type === 'Prestamo Familiar' && source.loan_direction === 'Recibido')
    .reduce((sum, source) => sum + source.loan_remaining, 0),
)
const total = computed(() => savedBalance.value + loanedOut.value)
const isLoan = computed(() => form.value.source_type === 'Prestamo Familiar')

const money = (value: number) => `${value.toFixed(2)} €`
const load = async () => {
  sources.value = (await api.get('/savings-sources')).data
}
const reset = () => {
  editing.value = null
  sourceFormOpen.value = false
  error.value = ''
  form.value = { name: '', source_type: 'Banco', balance: 0, loan_direction: '', loan_total: 0 }
}
const openCreate = () => {
  reset()
  sourceFormOpen.value = true
}
const save = async () => {
  error.value = ''
  const payload = {
    ...form.value,
    loan_direction: isLoan.value ? form.value.loan_direction : null,
    loan_total: isLoan.value ? form.value.loan_total : null,
  }
  try {
    if (editing.value === null) await api.post('/savings-sources', payload)
    else await api.put(`/savings-sources/${editing.value}`, payload)
    await load()
    emit('refresh')
    reset()
  } catch (requestError: any) {
    error.value = requestError.response?.data?.detail || 'No se pudo guardar la fuente.'
  }
}
const edit = (source: Source) => {
  editing.value = source.id
  error.value = ''
  form.value = {
    name: source.name,
    source_type: source.source_type,
    balance: source.balance,
    loan_direction: source.loan_direction || '',
    loan_total: source.loan_total || 0,
  }
  sourceFormOpen.value = true
}
const remove = async (source: Source) => {
  if (!confirm(`¿Eliminar "${source.name}"?`)) return
  await api.delete(`/savings-sources/${source.id}`)
  if (selectedLoan.value?.id === source.id) closeLoan()
  await load()
  emit('refresh')
}
const openLoan = async (source: Source) => {
  selectedLoan.value = source
  payments.value = (await api.get(`/savings-sources/${source.id}/payments`)).data
  paymentForm.value = { amount: 0, payment_date: new Date().toISOString().slice(0, 10), note: '' }
}
const closeLoan = () => {
  selectedLoan.value = null
  payments.value = []
}
const addPayment = async () => {
  if (!selectedLoan.value) return
  await api.post(`/savings-sources/${selectedLoan.value.id}/payments`, paymentForm.value)
  await load()
  const updated = sources.value.find((source) => source.id === selectedLoan.value?.id)
  if (updated) selectedLoan.value = updated
  payments.value = (await api.get(`/savings-sources/${selectedLoan.value.id}/payments`)).data
  paymentForm.value = { amount: 0, payment_date: new Date().toISOString().slice(0, 10), note: '' }
  emit('refresh')
}
const deletePayment = async (payment: LoanPayment) => {
  if (!selectedLoan.value || !confirm('¿Eliminar este movimiento?')) return
  await api.delete(`/savings-sources/${selectedLoan.value.id}/payments/${payment.id}`)
  await openLoan(selectedLoan.value)
  await load()
  emit('refresh')
}
onMounted(load)
</script>

<template>
  <section class="card">
    <header>
      <div>
        <h3>Ahorros</h3>
        <p>Saldo disponible en bancos, efectivo y otras fuentes.</p>
      </div>
      <strong>{{ money(total) }}</strong>
    </header>
    <button class="primary add-source" @click="openCreate">Añadir fuente</button>
    <div v-if="loanedOut || receivedPending" class="loan-summary">
      <span>Disponible en fuentes<strong>{{ money(savedBalance) }}</strong></span>
      <span v-if="loanedOut">Prestado<strong>{{ money(loanedOut) }}</strong></span>
      <span v-if="receivedPending">Por devolver<strong>{{ money(receivedPending) }}</strong></span>
      <span>Ahorro real<strong>{{ money(total) }}</strong></span>
    </div>

    <div v-if="sourceFormOpen" class="modal-backdrop" @click.self="reset">
    <form class="source-form source-form-modal" @submit.prevent="save">
      <button class="close" aria-label="Cerrar" type="button" @click="reset">×</button>
      <h3>{{ editing === null ? 'Añadir fuente de ahorro' : 'Editar fuente de ahorro' }}</h3>
      <label>
        <span>Nombre</span>
        <input v-model.trim="form.name" required placeholder="Ej.: BBVA" />
      </label>
      <label>
        <span>Tipo</span>
        <select v-model="form.source_type">
          <option>Banco</option>
          <option>Efectivo</option>
          <option>Plan de pensiones</option>
          <option>Otra</option>
          <option>Prestamo Familiar</option>
        </select>
      </label>
      <template v-if="isLoan">
        <label>
          <span>Dirección</span>
          <select v-model="form.loan_direction" required>
            <option disabled value="">Selecciona una opción</option>
            <option value="Recibido">Lo recibo</option>
            <option value="Concedido">Lo doy</option>
          </select>
        </label>
        <label>
          <span>Importe total (€)</span>
          <input v-model.number="form.loan_total" required min="0.01" step=".01" type="number" />
        </label>
      </template>
      <label v-else>
        <span>Saldo actual (€)</span>
        <input v-model.number="form.balance" required min="0" step=".01" type="number" />
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="form-actions">
        <button class="primary" type="submit">{{ editing === null ? 'Añadir fuente' : 'Actualizar' }}</button>
        <button v-if="editing !== null" class="secondary" type="button" @click="reset">Cancelar</button>
      </div>
    </form>
    </div>

    <div class="list">
      <article v-for="source in sources" :key="source.id">
        <div>
          <b>{{ source.name }}</b>
          <span v-if="source.source_type !== 'Prestamo Familiar'">{{ source.source_type }}</span>
          <span v-else>
            Préstamo {{ source.loan_direction === 'Recibido' ? 'recibido' : 'concedido' }} ·
            {{ source.loan_direction === 'Recibido' ? 'pendiente de devolver' : 'pendiente de recibir' }}:
            {{ money(source.loan_remaining) }}
          </span>
        </div>
        <strong v-if="source.source_type !== 'Prestamo Familiar'">{{ money(source.balance) }}</strong>
        <strong v-else>{{ money(source.loan_paid) }} registrado</strong>
        <button v-if="source.source_type === 'Prestamo Familiar'" @click="openLoan(source)">Movimientos</button>
        <button @click="edit(source)">Editar</button>
        <button class="danger" @click="remove(source)">Eliminar</button>
      </article>
      <p v-if="!sources.length">Aún no has añadido fuentes de dinero.</p>
    </div>
  </section>

  <div v-if="selectedLoan" class="modal-backdrop" @click.self="closeLoan">
    <section class="loan-modal">
      <button class="close" aria-label="Cerrar" @click="closeLoan">×</button>
      <h3>{{ selectedLoan.name }}</h3>
      <p>
        {{ selectedLoan.loan_direction === 'Recibido' ? 'Préstamo recibido' : 'Préstamo concedido' }} ·
        {{ money(selectedLoan.loan_remaining) }}
        {{ selectedLoan.loan_direction === 'Recibido' ? 'por devolver' : 'por recibir' }}
      </p>
      <div class="loan-metrics">
        <span>Total<strong>{{ money(selectedLoan.loan_total || 0) }}</strong></span>
        <span>{{ selectedLoan.loan_direction === 'Recibido' ? 'Pagado' : 'Devuelto' }}<strong>{{ money(selectedLoan.loan_paid) }}</strong></span>
        <span>Pendiente<strong>{{ money(selectedLoan.loan_remaining) }}</strong></span>
      </div>
      <form class="payment-form" @submit.prevent="addPayment">
        <label><span>Importe (€)</span><input v-model.number="paymentForm.amount" min="0.01" step=".01" required type="number" /></label>
        <label><span>Fecha</span><input v-model="paymentForm.payment_date" required type="date" /></label>
        <label class="wide"><span>Nota (opcional)</span><input v-model.trim="paymentForm.note" placeholder="Ej.: Transferencia mensual" /></label>
        <button class="primary" type="submit">{{ selectedLoan.loan_direction === 'Recibido' ? 'Añadir pago' : 'Añadir devolución' }}</button>
      </form>
      <div class="payment-list">
        <p v-if="!payments.length">Aún no hay movimientos registrados.</p>
        <article v-for="payment in payments" :key="payment.id">
          <div><b>{{ payment.payment_date }}</b><span>{{ payment.note || 'Sin nota' }}</span></div>
          <strong>{{ money(payment.amount) }}</strong>
          <button class="danger" @click="deletePayment(payment)">Eliminar</button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card { background: var(--bg-card); padding: 20px; border: 1px solid var(--border-color); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
header, article { display: flex; align-items: center; gap: 12px; }
header { justify-content: space-between; }
h3, p { margin: 0; }
header p, span { display: block; color: var(--text-muted); font-size: .85rem; }
.source-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 12px; align-items: end; margin: 20px 0; padding: 14px; background: var(--bg-subtle); border: 1px solid #edf1f5; border-radius: 10px; }
.source-form-modal { width: min(760px, 100%); margin: 0; padding: 26px; background: var(--bg-card); box-shadow: 0 20px 55px rgb(15 23 42 / 25%); }
.source-form-modal h3 { grid-column: 1 / -1; }
.add-source { display: block; margin: 16px 0 0 auto; }
label span { margin-bottom: 5px; font-weight: 700; color: var(--text-main); }
input, select { box-sizing: border-box; width: 100%; padding: 9px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); }
button { border: 0; border-radius: 8px; padding: 9px 12px; background: none; color: var(--primary); font-weight: 700; cursor: pointer; }
.primary { background: var(--primary); color: #fff; }
.secondary { background: #e8edf5; color: var(--text-main); }
.form-actions { display: flex; gap: 8px; }
.form-error { grid-column: 1 / -1; color: #dc2626; font-size: .85rem; }
.loan-summary { display: flex; gap: 20px; margin-top: 14px; padding: 10px 12px; background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: 10px; }
.loan-summary span { color: var(--text-muted); }
.loan-summary strong { display: block; color: var(--text-main); font-size: .95rem; }
.list { border-top: 1px solid var(--border-color); }
article { padding: 13px 4px; border-bottom: 1px solid var(--border-color); }
article div { flex: 1; }
.danger { color: #dc2626; }
.modal-backdrop { position: fixed; inset: 0; display: grid; place-items: center; padding: 20px; background: rgb(15 23 42 / 48%); z-index: 30; }
.loan-modal { position: relative; width: min(680px, 100%); padding: 24px; background: var(--bg-card); border-radius: var(--radius-card); box-shadow: 0 20px 55px rgb(15 23 42 / 25%); }
.close { position: absolute; top: 12px; right: 12px; font-size: 1.5rem; color: var(--text-main); }
.loan-modal > p { margin-top: 5px; }
.loan-metrics { display: grid; grid-template-columns: repeat(3, 1fr); margin: 18px 0; border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; }
.loan-metrics span { padding: 11px; border-right: 1px solid var(--border-color); }
.loan-metrics span:last-child { border-right: 0; }
.loan-metrics strong { display: block; margin-top: 3px; color: var(--text-main); font-size: 1rem; }
.payment-form { display: grid; grid-template-columns: 1fr 1fr 2fr auto; gap: 10px; align-items: end; }
.payment-list { margin-top: 16px; border-top: 1px solid var(--border-color); }
.payment-list article { padding-inline: 0; }
@media (max-width: 850px) { .source-form, .payment-form { grid-template-columns: 1fr 1fr; } .form-actions { grid-column: 1 / -1; } .payment-form .wide { grid-column: 1 / -1; } }
@media (max-width: 580px) { .source-form, .payment-form { grid-template-columns: 1fr; } .loan-metrics { grid-template-columns: 1fr; } .loan-metrics span { border-right: 0; border-bottom: 1px solid var(--border-color); } }
</style>

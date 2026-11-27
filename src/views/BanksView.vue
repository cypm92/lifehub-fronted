<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import api from '../services/api'

type DestinationType = 'fixed' | 'weekly' | 'extra' | 'income'
type RuleField = 'concept' | 'counterparty'
interface Bank { name: string; country: string }
interface Connection { id: number; bank_name: string; bank_country: string; status: 'active' | 'expired' | 'error'; valid_until: string }
interface Account { id: number; connection_id: number; data: Record<string, unknown>; balances: { balances?: unknown[] } | null }
interface Assignment { id: number; transaction_id: number; destination_type: DestinationType; destination_id: number | null }
interface BankTransaction { id: number; account_id: number; raw_data: Record<string, unknown>; assignment: Assignment | null }
interface Destination { id: number | null; name: string; month_code?: string }
type Destinations = Record<DestinationType, Destination[]>
interface Rule { id: number; field: RuleField; contains: string; destination_type: DestinationType; destination_id: number | null }
interface FieldCount { present: number; total: number }
interface AccountCoverage { id: number; connection_id: number; name: string | null; total: number; fields: Record<string, FieldCount>; statuses: Record<string, number> }
interface BankCoverage { name: string; country: string; total: number; fields: Record<string, FieldCount>; statuses: Record<string, number>; accounts: AccountCoverage[] }

const route = useRoute()
const router = useRouter()
const configured = ref<boolean | null>(null)
const banks = ref<Bank[]>([])
const bankError = ref('')
const selectedBank = ref<number | null>(null)
const connections = ref<Connection[]>([])
const accounts = ref<Account[]>([])
const transactions = ref<BankTransaction[]>([])
const rules = ref<Rule[]>([])
const destinationLists = ref<Destinations>({ fixed: [], weekly: [], extra: [], income: [] })
const coverage = ref<BankCoverage[]>([])
const connectionId = ref<number | null>(null)
const accountId = ref<number | null>(null)
const total = ref(0)
const offset = ref(0)
const pageSize = 100
const busy = ref(false)
const error = ref('')
const notice = ref('')
const returnUrl = ref('')
const editingId = ref<number | null>(null)
const assignmentForm = ref<{ type: DestinationType; id: number | null; makeRule: boolean; field: RuleField; contains: string }>({
  type: 'income', id: null, makeRule: false, field: 'concept', contains: '',
})
const selectedConnection = computed(() => connections.value.find((connection) => connection.id === connectionId.value))
const selectedAccount = computed(() => accounts.value.find((account) => account.id === accountId.value))
const options = computed(() => destinationLists.value[assignmentForm.value.type])
const fieldLabels: Record<string, string> = {
  remittance: 'Concepto / remittance', counterparty: 'Contraparte', counterparty_iban: 'IBAN contraparte',
  status: 'Estado', merchant_category_code: 'Código de categoría (MCC)', bank_transaction_code: 'Código bancario',
  booking_date: 'Fecha contable', value_date: 'Fecha valor', transaction_date: 'Fecha de operación',
  amount: 'Importe', credit_debit_indicator: 'Cargo / abono', transaction_id: 'ID de transacción', entry_reference: 'Referencia bancaria',
}
const typeLabels: Record<DestinationType, string> = { fixed: 'Gasto fijo del mes', weekly: 'Categoría semanal', extra: 'Categoría extra', income: 'Ingreso' }
const statusLabels: Record<string, string> = { active: 'Activa', expired: 'Caducada', error: 'Error' }

function errorText(err: unknown): string {
  const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined
  return typeof detail === 'string' ? detail : 'No se pudo completar la operación. Comprueba la conexión con el servidor.'
}
function nameOfAccount(account: Account): string {
  const name = account.data.name
  const accountNumber = account.data.account_id
  const iban = accountNumber && typeof accountNumber === 'object' && 'iban' in accountNumber ? accountNumber.iban : ''
  return typeof name === 'string' && name ? name : typeof iban === 'string' && iban ? iban : `Cuenta ${account.id}`
}
function destinationName(type: DestinationType, id: number | null): string {
  if (type === 'income') return 'Ingreso'
  const item = destinationLists.value[type].find((option) => option.id === id)
  return item ? `${typeLabels[type]}: ${item.name}${item.month_code ? ` (${item.month_code})` : ''}` : `${typeLabels[type]}: destino no disponible`
}
function description(raw: Record<string, unknown>): string {
  const value = raw.remittance_information
  if (Array.isArray(value)) return value.filter((part): part is string => typeof part === 'string').join(' · ') || 'Sin concepto'
  return typeof value === 'string' && value ? value : typeof raw.note === 'string' && raw.note ? raw.note : 'Sin concepto'
}
function counterparty(raw: Record<string, unknown>): string {
  const keys = raw.credit_debit_indicator === 'DBIT' ? ['creditor'] : raw.credit_debit_indicator === 'CRDT' ? ['debtor'] : ['creditor', 'debtor']
  for (const key of keys) {
    const value = raw[key]
    if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string' && value.name) return value.name
  }
  return 'Sin contraparte'
}
function amount(raw: Record<string, unknown>): string {
  const value = raw.transaction_amount
  if (!value || typeof value !== 'object' || !('amount' in value)) return 'Sin importe'
  const number = value.amount
  const currency = 'currency' in value && typeof value.currency === 'string' ? value.currency : ''
  return `${raw.credit_debit_indicator === 'DBIT' ? '−' : raw.credit_debit_indicator === 'CRDT' ? '+' : ''}${String(number)} ${currency}`.trim()
}
function bookingDate(raw: Record<string, unknown>): string {
  const value = raw.booking_date || raw.transaction_date || raw.value_date
  return typeof value === 'string' ? value : 'Sin fecha'
}
function dateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-ES')
}

async function loadTransactions() {
  if (accountId.value === null) { transactions.value = []; total.value = 0; return }
  const { data } = await api.get<{ total: number; transactions: BankTransaction[] }>(`/banks/accounts/${accountId.value}/transactions`, { params: { offset: offset.value, limit: pageSize } })
  transactions.value = data.transactions
  total.value = data.total
  editingId.value = null
}
async function loadAccounts() {
  if (connectionId.value === null) { accounts.value = []; accountId.value = null; await loadTransactions(); return }
  const { data } = await api.get<Account[]>(`/banks/connections/${connectionId.value}/accounts`)
  accounts.value = data
  if (!data.some((account) => account.id === accountId.value)) { accountId.value = data[0]?.id ?? null; offset.value = 0 }
  await loadTransactions()
}
async function loadAll() {
  const status = await api.get<{ configured: boolean }>('/banks/status')
  configured.value = status.data.configured
  bankError.value = ''
  const [connectionResponse, destinationsResponse, ruleResponse, coverageResponse, bankResponse] = await Promise.all([
    api.get<Connection[]>('/banks/connections'), api.get<Destinations>('/banks/destinations'),
    api.get<Rule[]>('/banks/rules'), api.get<{ banks: BankCoverage[] }>('/banks/coverage'),
    status.data.configured ? api.get<{ banks: Bank[] }>('/banks/aspsps').catch((err: unknown) => {
      bankError.value = errorText(err)
      return { data: { banks: [] as Bank[] } }
    }) : Promise.resolve({ data: { banks: [] as Bank[] } }),
  ])
  connections.value = connectionResponse.data
  destinationLists.value = destinationsResponse.data
  rules.value = ruleResponse.data
  coverage.value = coverageResponse.data.banks
  banks.value = bankResponse.data.banks
  selectedBank.value = null
  if (!connections.value.some((connection) => connection.id === connectionId.value)) {
    connectionId.value = connections.value[0]?.id ?? null
    accountId.value = null
    offset.value = 0
  }
  await loadAccounts()
}
async function perform(operation: () => Promise<void>, success = '') {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try { await operation(); if (success) notice.value = success } catch (err: unknown) { error.value = errorText(err) } finally { busy.value = false }
}
async function selectConnection(id: number) {
  await perform(async () => { connectionId.value = id; accountId.value = null; offset.value = 0; await loadAccounts() })
}
async function selectAccount(id: number) {
  await perform(async () => { accountId.value = id; offset.value = 0; await loadTransactions() })
}
async function changePage(delta: number) {
  await perform(async () => { offset.value = Math.max(0, offset.value + delta * pageSize); await loadTransactions() })
}
async function connect() {
  const bank = selectedBank.value === null ? undefined : banks.value[selectedBank.value]
  if (!bank) return
  await perform(async () => {
    const { data } = await api.post<{ url: string }>('/banks/auth', bank)
    window.location.assign(data.url)
  })
}
async function completeReturn() {
  await perform(async () => { await api.post('/banks/callback', { return_url: returnUrl.value.trim() }); returnUrl.value = ''; await loadAll() }, 'Conexión completada.')
}
async function renew(id: number) {
  await perform(async () => { const { data } = await api.post<{ url: string }>(`/banks/connections/${id}/renew`); window.location.assign(data.url) })
}
async function removeConnection(id: number) {
  if (!window.confirm('Se revocará la conexión y se borrarán sus cuentas, movimientos y asignaciones bancarias. ¿Continuar?')) return
  await perform(async () => { await api.delete(`/banks/connections/${id}`); await loadAll() }, 'Conexión eliminada.')
}
async function sync(id: number) {
  await perform(async () => {
    const { data } = await api.post<{ created: number; updated: number }>(`/banks/connections/${id}/sync`)
    await loadAll()
    notice.value = `Sincronización completada: ${data.created} nuevos y ${data.updated} actualizados.`
  })
}
function editAssignment(transaction: BankTransaction) {
  editingId.value = transaction.id
  assignmentForm.value = { type: transaction.assignment?.destination_type ?? 'income', id: transaction.assignment?.destination_id ?? null, makeRule: false, field: 'concept', contains: '' }
}
function changeType() { assignmentForm.value.id = null }
async function saveAssignment() {
  const id = editingId.value
  if (id === null) return
  const form = assignmentForm.value
  await perform(async () => {
    await api.put(`/banks/transactions/${id}/assignment`, {
      destination_type: form.type, destination_id: form.type === 'income' ? null : form.id,
      rule: form.makeRule ? { field: form.field, contains: form.contains.trim() } : null,
    })
    await loadTransactions()
    rules.value = (await api.get<Rule[]>('/banks/rules')).data
  }, 'Asignación guardada. No modifica los presupuestos.')
}
async function unassign(id: number) {
  await perform(async () => { await api.delete(`/banks/transactions/${id}/assignment`); await loadTransactions() }, 'Asignación eliminada.')
}
async function applyRules() {
  await perform(async () => {
    const { data } = await api.post<{ assigned: number; invalid_rules: number }>('/banks/rules/apply')
    await loadTransactions()
    notice.value = `Reglas aplicadas: ${data.assigned} asignaciones nuevas${data.invalid_rules ? `; ${data.invalid_rules} reglas con destino no disponible` : ''}.`
  })
}
async function deleteRule(id: number) {
  if (!window.confirm('¿Eliminar esta regla? Las asignaciones existentes se conservan.')) return
  await perform(async () => { await api.delete(`/banks/rules/${id}`); rules.value = (await api.get<Rule[]>('/banks/rules')).data }, 'Regla eliminada.')
}
onMounted(async () => {
  const connected = route.query.connected === '1'
  if (connected) await router.replace('/banks')
  await perform(loadAll, connected ? 'Conexión completada.' : '')
})
</script>

<template>
  <div class="banks-page">
    <header class="page-header">
      <div><span class="eyebrow">OPEN BANKING · USO PERSONAL</span><h1>Bancos <span class="beta">beta</span></h1><p>Explora los datos bancarios y registra asignaciones sin alterar tus presupuestos.</p></div>
      <button class="secondary" :disabled="busy" @click="perform(loadAll)">Actualizar</button>
    </header>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
    <p v-if="busy" class="loading" role="status">Procesando…</p>

    <section class="card setup">
      <div><h2>Conectar un banco</h2><p class="muted">Selecciona una entidad disponible en Enable Banking. La autorización se realiza en el banco.</p></div>
      <p v-if="configured === false" class="feedback warning">Enable Banking no está configurado. Configura las variables del backend y reinícialo para conectar bancos.</p>
      <p v-else-if="configured === null" class="muted">Comprobando configuración…</p>
      <template v-else>
        <form class="inline-form" @submit.prevent="connect">
          <label>Entidad y país<select v-model="selectedBank" class="input" required><option :value="null" disabled>Selecciona un banco</option><option v-for="(bank, index) in banks" :key="`${bank.name}-${bank.country}`" :value="index">{{ bank.name }} · {{ bank.country }}</option></select></label>
          <button class="btn-primary" :disabled="busy || selectedBank === null">Conectar</button>
        </form>
        <p v-if="bankError" class="feedback error" role="alert">{{ bankError }}</p>
        <p v-else-if="!banks.length" class="muted">El proveedor no devuelve bancos compatibles disponibles.</p>
        <details class="return-help"><summary>¿La página de retorno no carga? Pegar URL de retorno</summary><p class="muted">Copia la URL completa de la barra de direcciones después de autorizar y pégala aquí. Se validará con tu autorización pendiente.</p><form class="inline-form" @submit.prevent="completeReturn"><label>URL de retorno<input v-model="returnUrl" class="input" type="url" placeholder="https://…/banks/callback?code=…&state=…" required autocomplete="off" /></label><button class="secondary" :disabled="busy">Completar conexión</button></form></details>
      </template>
    </section>

    <section class="card">
      <div class="section-heading"><div><h2>Conexiones</h2><p class="muted">Elimina una conexión para revocar el consentimiento cuando sea posible.</p></div></div>
      <p v-if="!connections.length" class="empty">Aún no hay conexiones bancarias.</p>
      <div v-for="connection in connections" :key="connection.id" class="connection-row">
        <div><strong>{{ connection.bank_name }} · {{ connection.bank_country }}</strong> <span class="badge" :class="connection.status === 'active' ? 'success' : 'danger'">{{ statusLabels[connection.status] || connection.status }}</span><div class="muted small">Válida hasta: {{ dateTime(connection.valid_until) }}</div></div>
        <div class="actions"><button class="secondary" :disabled="busy" @click="selectConnection(connection.id)">{{ connectionId === connection.id ? 'Seleccionada' : 'Ver cuentas' }}</button><button class="secondary" :disabled="busy || !configured || connection.status === 'expired'" @click="sync(connection.id)">Sincronizar</button><button class="secondary" :disabled="busy || !configured" @click="renew(connection.id)">Renovar</button><button class="secondary destructive" :disabled="busy" @click="removeConnection(connection.id)">Eliminar</button></div>
      </div>
    </section>

    <section class="card">
      <div class="section-heading"><div><h2>Cuentas y movimientos</h2><p class="muted">{{ selectedConnection ? `${selectedConnection.bank_name} · ${selectedConnection.bank_country}` : 'Selecciona una conexión.' }} Los movimientos se solicitan para los últimos 90 días.</p></div></div>
      <div v-if="accounts.length" class="account-tabs"><button v-for="account in accounts" :key="account.id" class="secondary" :class="{ selected: accountId === account.id }" :disabled="busy" @click="selectAccount(account.id)">{{ nameOfAccount(account) }}</button></div>
      <p v-else-if="connectionId !== null" class="empty">No hay cuentas disponibles para esta conexión.</p>
      <div v-if="selectedAccount" class="account-detail"><strong>{{ nameOfAccount(selectedAccount) }}</strong><details v-if="selectedAccount.balances"><summary>Ver saldos recibidos</summary><pre>{{ JSON.stringify(selectedAccount.balances.balances ?? [], null, 2) }}</pre></details><p v-else class="muted small">Sin saldos; sincroniza para consultarlos.</p></div>
      <p v-if="accountId !== null && !transactions.length" class="empty">No hay movimientos guardados para esta cuenta.</p>
      <article v-for="transaction in transactions" :key="transaction.id" class="transaction">
        <div class="transaction-heading"><div><strong>{{ description(transaction.raw_data) }}</strong><div class="muted small">{{ bookingDate(transaction.raw_data) }} · {{ counterparty(transaction.raw_data) }} · {{ transaction.raw_data.status || 'Sin estado' }}</div></div><strong>{{ amount(transaction.raw_data) }}</strong></div>
        <p class="assignment-label">{{ transaction.assignment ? destinationName(transaction.assignment.destination_type, transaction.assignment.destination_id) : 'Sin asignar' }}</p>
        <div class="actions"><button class="secondary" :disabled="busy" @click="editAssignment(transaction)">{{ transaction.assignment ? 'Editar asignación' : 'Asignar' }}</button><button v-if="transaction.assignment" class="secondary" :disabled="busy" @click="unassign(transaction.id)">Quitar asignación</button></div>
        <form v-if="editingId === transaction.id" class="assignment-form" @submit.prevent="saveAssignment">
          <label>Destino<select v-model="assignmentForm.type" class="input" @change="changeType"><option value="fixed">Gasto fijo del mes</option><option value="weekly">Categoría semanal</option><option value="extra">Categoría extra</option><option value="income">Ingreso</option></select></label>
          <label v-if="assignmentForm.type !== 'income'">Selecciona el destino<select v-model="assignmentForm.id" class="input" required><option :value="null" disabled>Selecciona…</option><option v-for="item in options" :key="item.id ?? 'income'" :value="item.id">{{ item.name }}{{ item.month_code ? ` · ${item.month_code}` : '' }}</option></select></label>
          <label class="checkbox"><input v-model="assignmentForm.makeRule" type="checkbox" /> Crear una regla desde esta asignación</label>
          <template v-if="assignmentForm.makeRule"><label>Campo<select v-model="assignmentForm.field" class="input"><option value="concept">Concepto</option><option value="counterparty">Contraparte</option></select></label><label>Contiene<input v-model.trim="assignmentForm.contains" class="input" required maxlength="200" placeholder="Texto a buscar" /></label></template>
          <div class="actions"><button class="btn-primary" :disabled="busy || (assignmentForm.type !== 'income' && assignmentForm.id === null)">Guardar</button><button type="button" class="secondary" @click="editingId = null">Cancelar</button></div>
        </form>
        <details><summary>Ver JSON crudo</summary><pre>{{ JSON.stringify(transaction.raw_data, null, 2) }}</pre></details>
      </article>
      <div v-if="total > pageSize" class="pagination"><button class="secondary" :disabled="busy || offset === 0" @click="changePage(-1)">Anterior</button><span>{{ offset + 1 }}–{{ Math.min(offset + pageSize, total) }} de {{ total }}</span><button class="secondary" :disabled="busy || offset + pageSize >= total" @click="changePage(1)">Siguiente</button></div>
    </section>

    <section class="card">
      <div class="section-heading"><div><h2>Reglas de asignación</h2><p class="muted">Se crean al asignar un movimiento. La primera regla coincidente se aplica solo a movimientos sin asignar.</p></div><button class="secondary" :disabled="busy || !rules.length" @click="applyRules">Aplicar reglas</button></div>
      <p v-if="!rules.length" class="empty">Todavía no hay reglas.</p>
      <div v-for="rule in rules" :key="rule.id" class="rule-row"><span>{{ rule.field === 'concept' ? 'Concepto' : 'Contraparte' }} contiene <strong>{{ rule.contains }}</strong> → {{ destinationName(rule.destination_type, rule.destination_id) }}</span><button class="secondary destructive" :disabled="busy" @click="deleteRule(rule.id)">Eliminar</button></div>
    </section>

    <section class="card">
      <h2>Qué trae cada banco</h2><p class="muted">Cobertura calculada sobre los movimientos guardados, no sobre campos teóricos. BOOK indica contabilizado y PDNG pendiente.</p>
      <p v-if="!coverage.length" class="empty">Conecta y sincroniza un banco para ver los campos disponibles.</p>
      <div v-for="bank in coverage" :key="`${bank.name}-${bank.country}`" class="coverage-bank"><h3>{{ bank.name }} · {{ bank.country }}</h3><p class="muted small">{{ bank.total }} movimientos guardados</p><div class="field-grid"><span v-for="(count, field) in bank.fields" :key="field">{{ fieldLabels[field] || field }} <strong>{{ count.present }}/{{ count.total }}</strong></span></div><p class="muted small">Estados recibidos: {{ Object.entries(bank.statuses).map(([name, count]) => `${name}: ${count}`).join(' · ') || 'ninguno' }}</p><details v-for="account in bank.accounts" :key="account.id"><summary>{{ account.name || `Cuenta ${account.id}` }} · {{ account.total }} movimientos</summary><div class="field-grid"><span v-for="(count, field) in account.fields" :key="field">{{ fieldLabels[field] || field }} <strong>{{ count.present }}/{{ count.total }}</strong></span></div><p class="muted small">Estados: {{ Object.entries(account.statuses).map(([name, count]) => `${name}: ${count}`).join(' · ') || 'ninguno' }}</p></details></div>
    </section>
  </div>
</template>

<style scoped>
.banks-page { max-width: 1350px; margin: 0 auto; padding: 30px; display: grid; gap: 18px; }
.page-header,.section-heading,.connection-row,.transaction-heading,.rule-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.page-header { align-items: flex-start; }
h1,h2,h3,p { margin: 0; } h1 { font-size: 1.9rem; margin: 5px 0; } h2 { font-size: 1.1rem; } h3 { font-size: 1rem; }
.page-header p,.muted { color: var(--text-muted); } .muted { margin-top: 6px; line-height: 1.5; } .small { font-size: .78rem; }
.eyebrow { color: var(--primary); font-weight: 800; font-size: .7rem; letter-spacing: .08em; } .beta { font-size: .7rem; background: var(--primary-light); color: var(--primary); padding: 4px 8px; border-radius: 10px; vertical-align: middle; }
.card { min-width: 0; } .setup { display: grid; gap: 12px; } .feedback { padding: 12px 14px; border-radius: 9px; } .feedback.error { color: #991b1b; background: #fee2e2; } .feedback.success { color: #166534; background: #dcfce7; } .warning { background: #fef3c7; color: #92400e; } .loading { color: var(--text-muted); }
.inline-form { display: flex; align-items: end; gap: 10px; } .inline-form label { flex: 1; max-width: 620px; } label { display: grid; gap: 5px; font-weight: 650; font-size: .82rem; } .secondary { border: 1px solid var(--border-color); border-radius: 9px; padding: 8px 12px; background: white; color: var(--text-main); font-weight: 650; cursor: pointer; } .secondary:hover { background: var(--bg-subtle); } button:disabled { opacity: .5; cursor: not-allowed; } .destructive { color: var(--danger); } .selected { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
.connection-row,.rule-row { padding: 14px 0; border-top: 1px solid var(--border-color); } .connection-row:first-of-type,.rule-row:first-of-type { margin-top: 14px; } .actions,.account-tabs,.pagination { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; } .account-tabs { margin-top: 16px; } .account-detail { margin-top: 14px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; }
.empty { color: var(--text-muted); padding: 16px 0 4px; } .return-help { margin-top: 4px; } details { margin-top: 10px; } summary { cursor: pointer; color: var(--primary); font-weight: 650; } pre { max-height: 320px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; padding: 12px; background: var(--bg-subtle); border-radius: 8px; font-size: .75rem; }
.transaction { padding: 16px 0; border-top: 1px solid var(--border-color); } .transaction:first-of-type { margin-top: 16px; } .assignment-label { color: var(--text-muted); font-size: .82rem; margin: 10px 0; } .assignment-form { margin-top: 12px; background: var(--bg-subtle); border-radius: 10px; padding: 14px; display: grid; gap: 10px; max-width: 550px; } .checkbox { display: flex; align-items: center; } .pagination { justify-content: center; padding-top: 15px; } .coverage-bank { border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px; } .field-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 7px; margin: 12px 0; } .field-grid span { display: flex; justify-content: space-between; gap: 8px; padding: 7px 9px; background: var(--bg-subtle); border-radius: 7px; font-size: .78rem; }
@media (max-width: 800px) { .banks-page { padding: 18px; } .page-header,.connection-row,.section-heading,.rule-row { align-items: flex-start; flex-direction: column; } .inline-form { align-items: stretch; flex-direction: column; } }
</style>

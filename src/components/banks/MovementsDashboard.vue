<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { Chart } from 'vue-chartjs'
import { Chart as ChartJS, BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Legend, Tooltip, type ChartData, type ChartOptions } from 'chart.js'
import { getBankMovements, type BankMovement, type MovementAccount } from '../../services/api'
import { calculateKpis, filterMovements, temporalSeries } from '../../services/bankingAggregations'
import MovementCalendar from './MovementCalendar.vue'
import MovementExplorer from './MovementExplorer.vue'
import { euro } from './format'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Legend, Tooltip)

interface Connection { id: number; bank_name: string; status: string }
const props = defineProps<{ connections: Connection[] }>()
const route = useRoute()
const router = useRouter()
const movements = ref<BankMovement[]>([])
const accounts = ref<MovementAccount[]>([])
const loading = ref(false)
const error = ref('')
const excludeInternal = ref(true)
const days = computed(() => {
  const value = Number(route.query.days)
  return value === 30 || value === 60 || value === 90 ? value : 90
})
const connectionId = computed(() => {
  const value = route.query.connection_id
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
})
const activeConnections = computed(() => props.connections.filter((connection) => connection.status === 'active'))
const selectedMovements = computed(() => filterMovements(movements.value, { excludeInternal: excludeInternal.value }))
const kpis = computed(() => calculateKpis(selectedMovements.value, accounts.value))
const end = computed(() => new Date().toISOString().slice(0, 10))
const start = computed(() => {
  const date = new Date(`${end.value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days.value + 1)
  return date.toISOString().slice(0, 10)
})
const interval = computed(() => days.value > 31 ? 'week' : 'day')
const series = computed(() => temporalSeries(selectedMovements.value, start.value, end.value, interval.value))
const chartData = computed<ChartData<'bar' | 'line'>>(() => ({
  labels: series.value.map((point) => new Date(`${point.date}T00:00:00Z`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' })),
  datasets: [
    { type: 'bar', label: 'Gastos', data: series.value.map((point) => point.expenses), backgroundColor: '#f87171', borderRadius: 4, order: 2 },
    { type: 'bar', label: 'Ingresos', data: series.value.map((point) => point.income), backgroundColor: '#4ade80', borderRadius: 4, order: 2 },
    { type: 'line', label: 'Neto acumulado', data: series.value.map((point) => point.cumulativeNet), borderColor: '#4f46e5', backgroundColor: '#4f46e5', tension: 0.25, pointRadius: 2, order: 1 },
  ],
}))
const chartOptions: ChartOptions<'bar' | 'line'> = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${euro.format(context.parsed.y ?? 0)}` } } },
  scales: { y: { ticks: { callback: (value) => euro.format(Number(value)) } }, x: { grid: { display: false } } },
}
let request = 0
async function refresh() {
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const result = await getBankMovements(days.value, connectionId.value)
    if (current !== request) return
    movements.value = result.movements
    accounts.value = result.accounts
  } catch (err: unknown) {
    if (current !== request) return
    movements.value = []
    accounts.value = []
    const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined
    error.value = typeof detail === 'string' ? detail : 'No se pudieron cargar los movimientos.'
  } finally {
    if (current === request) loading.value = false
  }
}
function updateQuery(key: 'days' | 'connection_id', value: string | undefined) {
  void router.replace({ query: { ...route.query, [key]: value } })
}
watch([days, connectionId], refresh, { immediate: true })
defineExpose({ refresh })
</script>

<template>
  <div class="dashboard">
    <section class="card controls" aria-label="Filtros de movimientos">
      <div class="bank-tabs" aria-label="Banco">
        <button type="button" class="tab" :class="{ selected: connectionId === null }" :aria-pressed="connectionId === null" @click="updateQuery('connection_id', undefined)">Todos</button>
        <button v-for="connection in activeConnections" :key="connection.id" type="button" class="tab" :class="{ selected: connectionId === connection.id }" :aria-pressed="connectionId === connection.id" @click="updateQuery('connection_id', String(connection.id))">{{ connection.bank_name }}</button>
      </div>
      <label class="period">Periodo <select :value="days" class="input" @change="updateQuery('days', ($event.target as HTMLSelectElement).value)"><option :value="30">30 días</option><option :value="60">60 días</option><option :value="90">90 días</option></select></label>
      <label class="switch"><input v-model="excludeInternal" type="checkbox" /> Excluir traspasos internos</label>
    </section>
    <p v-if="loading" class="muted" role="status">Cargando movimientos…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else>
      <div class="kpi-grid">
        <article class="card kpi"><span>Gastos</span><strong class="expense">{{ euro.format(kpis.expenses) }}</strong></article>
        <article class="card kpi"><span>Ingresos</span><strong class="income">{{ euro.format(kpis.income) }}</strong></article>
        <article class="card kpi"><span>Neto</span><strong :class="kpis.net < 0 ? 'expense' : 'income'">{{ euro.format(kpis.net) }}</strong></article>
        <article class="card kpi"><span>Movimientos</span><strong>{{ kpis.count }}</strong></article>
        <article class="card kpi"><span>Saldo actual</span><strong>{{ kpis.balance === null ? 'No disponible' : euro.format(kpis.balance) }}</strong><small v-if="kpis.balance !== null && kpis.balanceAvailableAccounts < kpis.balanceTotalAccounts">{{ kpis.balanceAvailableAccounts }} de {{ kpis.balanceTotalAccounts }} cuentas con saldo en EUR</small></article>
      </div>
      <section class="card chart-card">
        <h2>Evolución del periodo</h2><p class="muted">Gastos e ingresos por {{ interval === 'week' ? 'semana' : 'día' }} y neto acumulado · importes en EUR</p>
        <div class="chart-container"><Chart type="bar" :data="chartData" :options="chartOptions" aria-label="Gráfica de gastos, ingresos y neto acumulado" /></div>
        <p v-if="!selectedMovements.length" class="muted">No hay movimientos para este periodo.</p>
        <p v-if="movements.some((movement) => movement.currency && movement.currency !== 'EUR')" class="muted small">Los importes en otras divisas no se suman a las métricas en EUR.</p>
      </section>
      <MovementCalendar :movements="selectedMovements" :start="start" :end="end" />
      <MovementExplorer :movements="selectedMovements" :accounts="accounts" />
    </template>
  </div>
</template>

<style scoped>
.dashboard { display: grid; gap: 18px; min-width: 0; }
.controls { display: flex; flex-wrap: wrap; align-items: end; gap: 14px; }
.bank-tabs { display: flex; flex-wrap: wrap; gap: 8px; flex: 1 1 320px; min-width: 0; }
.tab { background: white; border: 1px solid var(--border-color); border-radius: 9px; padding: 9px 13px; font-weight: 650; color: var(--text-main); cursor: pointer; overflow-wrap: anywhere; }
.tab.selected { color: var(--primary); background: var(--primary-light); border-color: var(--primary); }
.period { display: grid; gap: 5px; font-weight: 650; font-size: .82rem; }
.switch { display: flex; gap: 7px; align-items: center; font-weight: 650; font-size: .82rem; padding-bottom: 10px; }
.kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.kpi { display: grid; align-content: start; gap: 9px; min-width: 0; }
.kpi span, .kpi small, .muted { color: var(--text-muted); }
.kpi strong { font-size: 1.25rem; overflow-wrap: anywhere; }
.expense { color: var(--danger); } .income { color: var(--success); }
.chart-card { min-width: 0; } h2,p { margin: 0; } h2 { font-size: 1.1rem; } .muted { margin-top: 6px; line-height: 1.5; } .small { font-size: .78rem; }
.chart-container { position: relative; height: 320px; min-width: 0; margin-top: 16px; }
.error { padding: 12px 14px; border-radius: 9px; color: #991b1b; background: #fee2e2; }
@media (max-width: 1000px) { .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .kpi { padding: 14px; } .kpi strong { font-size: 1.05rem; } .chart-container { height: 260px; } }
</style>

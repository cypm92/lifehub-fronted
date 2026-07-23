<script setup lang="ts">
import { computed } from 'vue'

interface WeeklyExpense {
  id: number
  week_number: number
  week_date_label: string
  allocated_amount: number
  status: 'Pagado' | 'Parado' | 'Esperando'
}

const props = defineProps<{ weeklyExpenses: WeeklyExpense[] }>()
const emit = defineEmits<{ (e: 'viewAll'): void }>()

const planned = computed(() => props.weeklyExpenses.reduce((total, item) => total + item.allocated_amount, 0))
const paid = computed(() => props.weeklyExpenses
  .filter(item => item.status === 'Pagado')
  .reduce((total, item) => total + item.allocated_amount, 0))
const pending = computed(() => planned.value - paid.value)
const weeks = computed(() => {
  const groups = new Map<number, WeeklyExpense[]>()
  props.weeklyExpenses.forEach(item => groups.set(item.week_number, [...(groups.get(item.week_number) || []), item]))
  return [...groups.entries()].map(([number, items]) => ({
    number,
    label: items[0]?.week_date_label || '',
    total: items.reduce((sum, item) => sum + item.allocated_amount, 0),
    paid: items.every(item => item.status === 'Pagado'),
  })).slice(0, 5)
})
</script>

<template>
  <section class="weekly-summary card">
    <div class="summary-header"><div><h3>Gastos Semanales</h3><span>Control y presupuesto por semana</span></div><button class="btn-link" @click="emit('viewAll')">Abrir control semanal →</button></div>
    <div class="summary-body">
      <div class="summary-metrics"><div><span>Presupuestado</span><strong>{{ planned.toFixed(2) }} €</strong></div><div><span>Pagado</span><strong class="success">{{ paid.toFixed(2) }} €</strong></div><div><span>Pendiente</span><strong :class="pending ? 'warning' : 'success'">{{ pending.toFixed(2) }} €</strong></div></div>
      <div class="weeks-list"><div v-for="week in weeks" :key="week.number" class="week-item"><span :class="['week-state', { paid: week.paid }]">{{ week.paid ? '✓' : week.number }}</span><span><strong>Semana {{ week.number }}</strong><small>{{ week.label }}</small></span><strong>{{ week.total.toFixed(2) }} €</strong></div><span v-if="!weeks.length" class="empty">Sin semanas configuradas.</span></div>
    </div>
  </section>
</template>

<style scoped>
.weekly-summary { margin-bottom:28px; }.summary-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px; }.summary-header h3 { margin:0 0 4px; }.summary-header span,.summary-metrics span,small,.empty { color:var(--text-muted); font-size:.84rem; }.btn-link { border:0; background:none; color:var(--primary); cursor:pointer; font-weight:700; padding:2px 0; }.summary-body { display:grid; grid-template-columns:minmax(310px,.9fr) minmax(280px,1.1fr); gap:22px; }.summary-metrics { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--border-color); border-radius:10px; overflow:hidden; }.summary-metrics div { padding:12px; border-right:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px; }.summary-metrics div:last-child { border:0; }.summary-metrics strong { font-size:1.05rem; }.success { color:#16a34a; }.warning { color:#b45309; }.weeks-list { display:flex; gap:8px; flex-wrap:wrap; align-content:flex-start; }.week-item { min-width:115px; flex:1; display:flex; align-items:center; gap:7px; padding:8px; border:1px solid var(--border-color); border-radius:8px; font-size:.8rem; }.week-item span:nth-child(2) { display:flex; flex-direction:column; min-width:0; }.week-item strong:last-child { margin-left:auto; white-space:nowrap; }.week-state { display:grid; place-items:center; width:21px; height:21px; flex:none; border-radius:50%; background:#fef3c7; color:#92400e; font-weight:800; }.week-state.paid { background:#dcfce7; color:#166534; } @media (max-width:760px) { .summary-header,.summary-body { display:flex; flex-direction:column; }.summary-body { gap:16px; }.summary-metrics,.weeks-list { width:100%; box-sizing:border-box; } }
</style>

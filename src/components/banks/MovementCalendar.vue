<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BankMovement } from '../../services/api'
import { monthlyCalendar } from '../../services/bankingAggregations'
import MovementRow from './MovementRow.vue'
import { euro, uppercaseInitial } from './format'

const props = defineProps<{ movements: BankMovement[]; start: string; end: string }>()
const month = ref(props.end.slice(0, 7))
const selectedDay = ref<string | null>(null)
watch(() => [props.start, props.end], () => { month.value = props.end.slice(0, 7); selectedDay.value = null })
const weeks = computed(() => monthlyCalendar(props.movements, month.value, props.start, props.end))
const maxExpense = computed(() => Math.max(0, ...weeks.value.flat().filter((day) => day.inMonth).map((day) => day.expenses)))
const selected = computed(() => weeks.value.flat().find((day) => day.date === selectedDay.value && day.inMonth && day.inPeriod))
const title = computed(() => uppercaseInitial(new Date(`${month.value}-01T00:00:00Z`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })))
function changeMonth(delta: number) {
  const date = new Date(`${month.value}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + delta)
  month.value = date.toISOString().slice(0, 7)
  selectedDay.value = null
}
function intensity(value: number) {
  if (!value || !maxExpense.value) return 0
  return Math.ceil(value / maxExpense.value * 4)
}
function dateLabel(value: string) {
  return uppercaseInitial(new Date(`${value}T00:00:00Z`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))
}
</script>

<template>
  <section class="card calendar-card">
    <div class="heading"><div><h2>Calendario de gastos</h2><p class="muted">Intensidad según el gasto diario en EUR. Selecciona un día para ver el detalle.</p></div>
      <div class="navigation"><button class="nav" :disabled="month <= start.slice(0, 7)" aria-label="Mes anterior" @click="changeMonth(-1)">‹</button><strong class="month">{{ title }}</strong><button class="nav" :disabled="month >= end.slice(0, 7)" aria-label="Mes siguiente" @click="changeMonth(1)">›</button></div>
    </div>
    <div class="calendar" aria-label="Calendario mensual">
      <div v-for="(label, index) in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="index" class="weekday">{{ label }}</div>
      <template v-for="(week, index) in weeks" :key="index">
        <template v-for="day in week" :key="day.date">
          <button v-if="day.inMonth" class="day" :class="[`level-${intensity(day.expenses)}`, { selected: selectedDay === day.date }]" :disabled="!day.inPeriod" :aria-pressed="selectedDay === day.date" :aria-label="`${dateLabel(day.date)}, ${euro.format(day.expenses)} gastados, ${day.count} movimientos`" @click="selectedDay = day.date">
            <strong>{{ Number(day.date.slice(-2)) }}</strong><span class="day-amount" :title="euro.format(day.expenses)">{{ euro.format(day.expenses) }}</span><small>{{ day.count }} <span class="count-label">mov.</span></small>
          </button><div v-else class="outside" aria-hidden="true"></div>
        </template>
      </template>
    </div>
    <div v-if="selected" class="detail"><div class="detail-heading"><h3>{{ dateLabel(selected.date) }}</h3><button class="nav" aria-label="Cerrar detalle" @click="selectedDay = null">×</button></div><p v-if="!selected.movements.length" class="muted">No hay movimientos este día.</p><MovementRow v-for="movement in selected.movements" :key="movement.id" :movement="movement" /></div>
  </section>
</template>

<style scoped>
.calendar-card { min-width: 0; } .heading,.navigation,.detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; } .navigation { flex-shrink: 0; } h2,h3,p { margin: 0; } h2 { font-size: 1.1rem; } h3 { font-size: .95rem; } .muted { color: var(--text-muted); margin-top: 6px; line-height: 1.5; } .month { text-align: center; min-width: 120px; }
.nav { border: 1px solid var(--border-color); background: white; border-radius: 8px; padding: 3px 10px; cursor: pointer; font-size: 1.2rem; color: var(--text-main); } .nav:disabled { opacity: .4; cursor: not-allowed; }
.calendar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; margin-top: 16px; } .weekday { text-align: center; font-size: .75rem; font-weight: 700; color: var(--text-muted); padding: 4px; }
.day,.outside { min-width: 0; min-height: 78px; border-radius: 8px; } .day { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 7px; border: 1px solid transparent; text-align: left; color: var(--text-main); cursor: pointer; background: var(--bg-subtle); overflow: hidden; } .day:disabled { opacity: .35; cursor: default; } .day.selected { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); } .day-amount { font-size: .75rem; font-weight: 700; overflow-wrap: anywhere; } .day small { font-size: .68rem; color: #475569; }
.level-1 { background: #e0e7ff; } .level-2 { background: #c7d2fe; } .level-3 { background: #a5b4fc; } .level-4 { background: #818cf8; } .detail { margin-top: 20px; } .detail-heading { margin-bottom: 10px; }
@media (max-width: 750px) { .heading { align-items: flex-start; flex-direction: column; } }
@media (max-width: 500px) { .calendar-card { padding: 12px; } .calendar { gap: 3px; } .day,.outside { min-height: 60px; } .day { padding: 4px 2px; gap: 3px; font-size: .73rem; } .day-amount { font-size: .58rem; line-height: 1.1; word-break: break-all; } .day small { font-size: .58rem; } .count-label { display: none; } }
</style>

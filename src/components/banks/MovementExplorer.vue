<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BankMovement, MovementAccount } from '../../services/api'
import { filterMovements, groupMovementsByDay, topCounterparties } from '../../services/bankingAggregations'
import MovementRow from './MovementRow.vue'
import { euro, uppercaseInitial } from './format'

const props = defineProps<{ movements: BankMovement[]; accounts: MovementAccount[] }>()
const text = ref('')
const accountId = ref<number | null>(null)
const direction = ref<'all' | 'DBIT' | 'CRDT'>('all')
const visible = ref(50)
watch([text, accountId, direction, () => props.movements], () => { visible.value = 50 })
watch(() => props.accounts, (accounts) => {
  if (accountId.value !== null && !accounts.some((account) => account.id === accountId.value)) accountId.value = null
})
const filtered = computed(() => filterMovements(props.movements, { text: text.value, accountId: accountId.value, direction: direction.value }))
const groups = computed(() => groupMovementsByDay(filtered.value.slice(0, visible.value)))
const top = computed(() => topCounterparties(props.movements, 10))
const max = computed(() => top.value[0]?.amount || 1)
function label(value: string) {
  return uppercaseInitial(new Date(`${value}T00:00:00Z`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))
}
</script>

<template>
  <section class="card top-card">
    <h2>Top comercios y contrapartes</h2><p class="muted">Dónde has gastado más · importes en EUR</p>
    <p v-if="!top.length" class="empty">No hay gastos en EUR para mostrar.</p>
    <ol v-else class="top-list"><li v-for="item in top" :key="item.name"><div class="top-label"><strong>{{ item.name }}</strong><span>{{ euro.format(item.amount) }}</span></div><div class="track"><div class="bar" :style="{ width: `${item.amount / max * 100}%` }"></div></div><small>{{ item.count }} {{ item.count === 1 ? 'movimiento' : 'movimientos' }}</small></li></ol>
  </section>
  <section class="card list-card">
    <div class="list-title"><div><h2>Movimientos</h2><p class="muted">{{ filtered.length }} {{ filtered.length === 1 ? 'resultado' : 'resultados' }}</p></div></div>
    <div class="filters"><label>Buscar<input v-model="text" class="input" type="search" placeholder="Concepto, contraparte o banco" /></label><label>Cuenta<select v-model="accountId" class="input"><option :value="null">Todas las cuentas</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.bank_name }} · {{ account.name || account.type || 'Cuenta' }} (#{{ account.id }})</option></select></label><label>Tipo<select v-model="direction" class="input"><option value="all">Cargos y abonos</option><option value="DBIT">Cargos</option><option value="CRDT">Abonos</option></select></label></div>
    <p v-if="!groups.length" class="empty">No hay movimientos que coincidan con los filtros.</p>
    <div v-for="group in groups" :key="group.date" class="day-group"><h3>{{ label(group.date) }}</h3><MovementRow v-for="movement in group.movements" :key="movement.id" :movement="movement" /></div>
    <button v-if="visible < filtered.length" class="show-more" @click="visible += 50">Mostrar más ({{ Math.min(visible, filtered.length) }} de {{ filtered.length }})</button>
  </section>
</template>

<style scoped>
h2,h3,p { margin: 0; } h2 { font-size: 1.1rem; } h3 { font-size: .9rem; } .top-card,.list-card { min-width: 0; } .muted,.empty { color: var(--text-muted); } .muted { margin-top: 6px; line-height: 1.5; } .empty { padding-top: 16px; }
.top-list { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 12px; } .top-label { display: flex; justify-content: space-between; gap: 8px; } .top-label strong { overflow-wrap: anywhere; min-width: 0; } .top-label span { white-space: nowrap; } .track { height: 8px; background: var(--primary-light); border-radius: 8px; margin-top: 6px; overflow: hidden; } .bar { background: var(--primary); border-radius: inherit; height: 100%; } .top-list small { display: block; color: var(--text-muted); margin-top: 3px; }
.filters { display: grid; grid-template-columns: 2fr 1.4fr 1fr; gap: 10px; margin: 16px 0 4px; } label { min-width: 0; display: grid; gap: 5px; font-weight: 650; font-size: .82rem; } .input { min-width: 0; } .day-group { margin-top: 20px; } .day-group h3 { margin-bottom: 8px; }
.show-more { display: block; margin: 16px auto 0; padding: 9px 14px; background: white; border: 1px solid var(--border-color); border-radius: 9px; color: var(--primary); cursor: pointer; font-weight: 700; }
@media (max-width: 700px) { .filters { grid-template-columns: 1fr 1fr; } .filters label:first-child { grid-column: 1 / -1; } }
@media (max-width: 400px) { .filters { grid-template-columns: 1fr; } .filters label:first-child { grid-column: auto; } }
</style>

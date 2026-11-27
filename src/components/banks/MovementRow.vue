<script setup lang="ts">
import type { BankMovement } from '../../services/api'
import { formatMovementAmount } from './format'

defineProps<{ movement: BankMovement }>()
const labels = { fixed: 'Gasto fijo', weekly: 'Categoría semanal', extra: 'Categoría extra', income: 'Ingreso' }
</script>

<template>
  <article class="movement-row">
    <div class="description">
      <strong>{{ movement.counterparty || movement.concept || 'Sin concepto' }}</strong>
      <p v-if="movement.concept && movement.concept !== movement.counterparty">{{ movement.concept }}</p>
      <p>{{ movement.bank_name }} · {{ movement.account_name || `Cuenta ${movement.account_id}` }}</p>
      <div class="tags"><span v-if="movement.is_internal_transfer" class="transfer">Traspaso interno</span><span v-if="movement.assignment" class="assignment">{{ labels[movement.assignment.destination_type] }}<template v-if="movement.assignment.destination_id"> · #{{ movement.assignment.destination_id }}</template></span><span v-if="movement.status === 'PDNG'" class="pending">Pendiente</span></div>
    </div>
    <strong class="amount" :class="movement.amount === null ? '' : movement.amount < 0 ? 'expense' : 'income'">{{ formatMovementAmount(movement.amount, movement.currency) }}</strong>
  </article>
</template>

<style scoped>
.movement-row { display: flex; justify-content: space-between; gap: 14px; padding: 13px 0; border-top: 1px solid var(--border-color); min-width: 0; }
.description { min-width: 0; overflow-wrap: anywhere; line-height: 1.4; }
p { margin: 3px 0 0; color: var(--text-muted); font-size: .79rem; }
.amount { white-space: nowrap; font-size: .95rem; } .expense { color: var(--danger); } .income { color: var(--success); }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; font-size: .7rem; font-weight: 700; }
.tags span { padding: 3px 7px; border-radius: 8px; } .transfer { background: #e0e7ff; color: #4338ca; } .assignment { background: #f1f5f9; color: #475569; } .pending { background: #fef3c7; color: #92400e; }
@media (max-width: 450px) { .movement-row { gap: 8px; } .amount { font-size: .8rem; } }
</style>

<script setup lang="ts">
import { computed } from 'vue'

interface FixedExpense {
  id: number
  concept: string
  amount: number
  due_day: number
  status: 'Esperando' | 'Pagado'
  group_name?: string | null
  group_color?: string | null
}

const props = defineProps<{
  fixedExpenses: FixedExpense[]
  monthCode: string
  embedded?: boolean
}>()

const emit = defineEmits<{ (e: 'viewAll'): void }>()

const planned = computed(() =>
  props.fixedExpenses.reduce((total, expense) => total + expense.amount, 0)
)
const paid = computed(() =>
  props.fixedExpenses
    .filter((expense) => expense.status === 'Pagado')
    .reduce((total, expense) => total + expense.amount, 0)
)
const pending = computed(() => planned.value - paid.value)
const nextExpenses = computed(() =>
  props.fixedExpenses
    .filter((expense) => expense.status === 'Esperando')
    .sort((a, b) => a.due_day - b.due_day)
    .slice(0, 3)
)
</script>

<template>
  <section :class="['fixed-summary', { card: !embedded, embedded }]">
    <div v-if="!embedded" class="summary-header">
      <div>
        <h3>Gastos Fijos</h3>
        <span>Resumen de {{ monthCode }}</span>
      </div>
      <button class="btn-link" @click="emit('viewAll')">Abrir Gastos mensuales →</button>
    </div>

    <div class="summary-body">
      <div class="summary-metrics">
        <div>
          <span>Previsto</span><strong>{{ planned.toFixed(2) }} €</strong>
        </div>
        <div>
          <span>Pagado</span><strong class="success">{{ paid.toFixed(2) }} €</strong>
        </div>
        <div>
          <span>Pendiente</span
          ><strong :class="pending ? 'danger' : 'success'">{{ pending.toFixed(2) }} €</strong>
        </div>
      </div>

      <div class="next-payments">
        <p>Próximos pagos</p>
        <div v-if="nextExpenses.length" class="next-list">
          <div v-for="expense in nextExpenses" :key="expense.id" class="next-item">
            <span
              class="group-dot"
              :style="{ backgroundColor: expense.group_color || '#94a3b8' }"
            ></span>
            <span class="next-concept">{{ expense.concept }}</span>
            <span class="next-date">Día {{ expense.due_day }}</span>
            <strong>{{ expense.amount.toFixed(2) }} €</strong>
          </div>
        </div>
        <span v-else class="empty">No hay pagos pendientes este mes.</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fixed-summary {
  margin-bottom: 28px;
}
.fixed-summary.embedded {
  margin: 0 0 20px;
}
.summary-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.summary-header h3 {
  margin: 0 0 4px;
}
.summary-header span,
.summary-metrics span,
.next-payments p,
.empty {
  color: var(--text-muted);
  font-size: 0.84rem;
}
.btn-link {
  border: 0;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font-weight: 700;
  padding: 2px 0;
}
.summary-body {
  display: grid;
  grid-template-columns: minmax(310px, 0.9fr) minmax(280px, 1.1fr);
  gap: 22px;
}
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.summary-metrics div {
  padding: 12px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.summary-metrics div:last-child {
  border: 0;
}
.summary-metrics strong {
  font-size: 1.05rem;
}
.success {
  color: #16a34a;
}
.danger {
  color: #dc2626;
}
.next-payments {
  border-left: 1px solid var(--border-color);
  padding-left: 22px;
}
.next-payments p {
  margin: 0 0 6px;
  font-weight: 700;
}
.next-list {
  display: flex;
  flex-direction: column;
}
.next-item {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.88rem;
}
.next-item:last-child {
  border: 0;
}
.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.next-date {
  color: var(--text-muted);
}
.next-concept {
  font-weight: 650;
}
.empty {
  display: block;
  padding: 8px 0;
}
@media (max-width: 760px) {
  .summary-header,
  .summary-body {
    display: flex;
    flex-direction: column;
  }
  .summary-body {
    gap: 16px;
  }
  .summary-metrics,
  .next-payments {
    width: 100%;
    box-sizing: border-box;
  }
  .next-payments {
    border-left: 0;
    border-top: 1px solid var(--border-color);
    padding: 16px 0 0;
  }
}
</style>

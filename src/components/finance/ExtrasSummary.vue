<script setup lang="ts">
import { computed } from 'vue'
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
const props = defineProps<{ expenses: ExtraExpense[]; monthCode: string; future?: boolean }>()
const emit = defineEmits<{ (e: 'viewAll'): void }>()
const total = computed(() => props.expenses.reduce((sum, item) => sum + item.amount, 0))
const recent = computed(() => props.expenses.slice(0, 3))
</script>
<template>
  <section class="extras-summary card">
    <div class="summary-header">
      <div>
        <h3>{{ future ? 'Gastos futuros' : 'Otros Gastos' }}</h3>
        <span>{{
          future ? 'Compras programadas para meses posteriores' : `Gastos puntuales de ${monthCode}`
        }}</span>
      </div>
      <button class="btn-link" @click="emit('viewAll')">Abrir Otros gastos →</button>
    </div>
    <div class="summary-body">
      <div class="metrics">
        <div>
          <span>Gastado</span><strong>{{ total.toFixed(2) }} €</strong>
        </div>
        <div>
          <span>Compras</span><strong>{{ expenses.length }}</strong>
        </div>
      </div>
      <div class="recent">
        <p>Últimos gastos</p>
        <div v-for="item in recent" :key="item.id" class="recent-item">
          <span class="dot" :style="{ background: item.category_color || '#94a3b8' }"></span
          ><span>{{ item.concept }}</span
          ><strong>{{ item.amount.toFixed(2) }} €</strong>
        </div>
        <span v-if="!recent.length" class="empty">No hay extras este mes.</span>
      </div>
    </div>
  </section>
</template>
<style scoped>
.extras-summary {
  margin-bottom: 28px;
}
.summary-header,
.summary-body {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}
.summary-header h3,
.summary-header span,
.recent p {
  margin: 0;
}
.summary-header span,
.metrics span,
.recent p,
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
}
.summary-body {
  align-items: stretch;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  min-width: 310px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.metrics div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-right: 1px solid var(--border-color);
}
.metrics div:last-child {
  border: 0;
}
.metrics strong {
  font-size: 1.1rem;
}
.recent {
  flex: 1;
}
.recent p {
  font-weight: 700;
  margin-bottom: 5px;
}
.recent-item {
  display: grid;
  grid-template-columns: 9px 1fr auto;
  gap: 8px;
  padding: 5px 0;
  font-size: 0.88rem;
}
.dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
}
@media (max-width: 760px) {
  .summary-body {
    flex-direction: column;
  }
  .metrics {
    min-width: 0;
  }
}
</style>

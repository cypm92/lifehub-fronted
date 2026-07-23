<script setup lang="ts">
import { computed, ref } from 'vue'

interface WeeklyExpense {
  id: number
  month_code: string
  week_number: number
  week_date_label: string
  category_name: string
  allocated_amount: number
  status: 'Pagado' | 'Parado' | 'Esperando'
}

const props = defineProps<{
  weeklyExpenses: WeeklyExpense[]
  monthCode: string
}>()

const emit = defineEmits<{
  (e: 'toggleStatus', item: WeeklyExpense): void
  (e: 'updateAmount', item: WeeklyExpense, amount: number): void
  (e: 'refresh'): void
}>()

const editingAmountId = ref<number | null>(null)
const tempAmount = ref(0)
const isManagerOpen = ref(false)
const categories = ref<WeeklyCategory[]>([])
const editingCategoryId = ref<number | null>(null)
const categoryForm = ref({ name: '', weekly_amount: 0 })

const loadCategories = async () => {
  const { default: api } = await import('../../services/api')
  const response = await api.get('/weekly-expense-categories')
  categories.value = response.data
}

const openManager = async () => {
  await loadCategories()
  isManagerOpen.value = true
}

const resetCategoryForm = () => {
  editingCategoryId.value = null
  categoryForm.value = { name: '', weekly_amount: 0 }
}

const editCategory = (category: WeeklyCategory) => {
  editingCategoryId.value = category.id
  categoryForm.value = { name: category.name, weekly_amount: category.weekly_amount }
}

const saveCategory = async () => {
  try {
    const { default: api } = await import('../../services/api')
    if (editingCategoryId.value) await api.patch(`/weekly-expense-categories/${editingCategoryId.value}?month_code=${props.monthCode}`, categoryForm.value)
    else await api.post(`/weekly-expense-categories?month_code=${props.monthCode}`, categoryForm.value)
    await loadCategories()
    resetCategoryForm()
    emit('refresh')
  } catch (error: any) {
    alert(error.response?.data?.detail || 'No se pudo guardar la categoría semanal')
  }
}

const removeCategory = async (category: WeeklyCategory) => {
  if (!confirm(`¿Eliminar "${category.name}" de las próximas semanas?`)) return
  const { default: api } = await import('../../services/api')
  await api.delete(`/weekly-expense-categories/${category.id}?month_code=${props.monthCode}`)
  await loadCategories()
  emit('refresh')
}

const startAmountEdit = (item: WeeklyExpense) => {
  editingAmountId.value = item.id
  tempAmount.value = item.allocated_amount
}

interface WeeklyCategory {
  id: number
  name: string
  weekly_amount: number
}

const saveAmount = (item: WeeklyExpense) => {
  emit('updateAmount', item, tempAmount.value)
  editingAmountId.value = null
}

const groupedWeeks = computed(() => {
  const groups: Record<number, WeeklyExpense[]> = {}
  // Protección por si props.weeklyExpenses es undefined o null
  if (!props.weeklyExpenses) return groups

  props.weeklyExpenses.forEach(item => {
    const weekItems = groups[item.week_number] ?? []
    weekItems.push(item)
    groups[item.week_number] = weekItems
  })
  return groups
})

const getWeekTotal = (items: WeeklyExpense[]) => {
  return items.reduce((acc, curr) => acc + curr.allocated_amount, 0)
}

const getWeekStatusBadge = (items: WeeklyExpense[]) => {
  if (items.length === 0) return { text: 'PENDIENTE', class: 'status-waiting' }
  const allPaid = items.every(i => i.status === 'Pagado')
  const anyStopped = items.some(i => i.status === 'Parado')

  if (allPaid) return { text: 'COMPLETO', class: 'status-paid' }
  if (anyStopped) return { text: 'PARADO', class: 'status-stopped' }
  return { text: 'EN PROCESO', class: 'status-waiting' }
}
</script>

<template>
  <div>
    <div class="weekly-actions"><div><h3>Configuración semanal</h3><span>Define categorías e importe para cada semana.</span></div><button class="btn-manage" @click="openManager">Gestionar categorías</button></div>
    <!-- Si hay semanas, mostramos el grid -->
    <div v-if="weeklyExpenses && weeklyExpenses.length > 0" class="weeks-grid">
      <div v-for="(items, weekNum) in groupedWeeks" :key="weekNum" class="card week-card">
        <div class="week-header">
          <div>
            <h3>Semana {{ weekNum }}</h3>
            <span class="week-subtitle">{{ items[0]?.week_date_label || 'Plan Semanal' }}</span>
          </div>
          <span :class="['badge-status', getWeekStatusBadge(items).class]">
            {{ getWeekStatusBadge(items).text }}
          </span>
        </div>

        <table class="week-table">
          <thead>
          <tr>
            <th>Concepto</th>
            <th>Presupuesto</th>
            <th>Estado</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><strong>{{ item.category_name }}</strong></td>
            <td>
              <button v-if="editingAmountId !== item.id" class="amount-button" @click="startAmountEdit(item)">{{ item.allocated_amount.toFixed(2) }} € ✎</button>
              <span v-else class="amount-editor"><input v-model.number="tempAmount" min="0" step="0.01" type="number" /><button @click="saveAmount(item)">✓</button></span>
            </td>
            <td>
              <button
                  @click="emit('toggleStatus', item)"
                  :class="['btn-status-toggle', item.status.toLowerCase()]"
              >
                {{ item.status }}
              </button>
            </td>
          </tr>
          </tbody>
          <tfoot>
          <tr>
            <td><strong>Total Semana</strong></td>
            <td colspan="2"><strong>{{ getWeekTotal(items).toFixed(2) }} €</strong></td>
          </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Si está vacío, mostramos un aviso amigable en lugar de pantalla en blanco -->
    <div v-else class="card empty-state">
      <p>📅 No hay control semanal configurado para este mes.</p>
      <span class="subtitle-sm">Prueba a pulsar en el botón superior <strong>"Copiar Mes Anterior"</strong> para generar la plantilla.</span>
    </div>

    <div v-if="isManagerOpen" class="modal-backdrop" @click.self="isManagerOpen = false">
      <form class="modal" @submit.prevent="saveCategory">
        <div class="modal-header"><div><h3>Categorías semanales</h3><p>Cada categoría se crea automáticamente en todas las semanas del mes.</p></div><button type="button" class="btn-close" @click="isManagerOpen = false">×</button></div>
        <div v-if="categories.length" class="categories-manager-list"><div v-for="category in categories" :key="category.id" class="category-manager-row"><strong>{{ category.name }}</strong><span>{{ category.weekly_amount.toFixed(2) }} € / semana</span><button type="button" class="btn-link" @click="editCategory(category)">Editar</button><button type="button" class="btn-link danger" @click="removeCategory(category)">Eliminar</button></div></div>
        <label>Nombre<input v-model.trim="categoryForm.name" required maxlength="60" placeholder="Ej.: Mascotas" /></label>
        <label>Importe por semana (€)<input v-model.number="categoryForm.weekly_amount" required min="0" step="0.01" type="number" /></label>
        <div class="modal-actions"><button v-if="editingCategoryId" type="button" class="btn-secondary" @click="resetCategoryForm">Cancelar edición</button><button class="btn-primary" type="submit">{{ editingCategoryId ? 'Guardar categoría' : 'Crear categoría' }}</button></div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtitle-sm {
  font-size: 0.85rem;
}

.weeks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.week-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.badge-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-paid { background: #dcfce7; color: #15803d; }
.status-stopped { background: #fee2e2; color: #b91c1c; }
.status-waiting { background: #fef3c7; color: #b45309; }

.week-table {
  width: 100%;
  border-collapse: collapse;
}

.week-table th, .week-table td {
  padding: 8px 4px;
  text-align: left;
  font-size: 0.9rem;
  border-bottom: 1px solid #f1f5f9;
}

.weekly-actions { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:18px; }.weekly-actions h3 { margin:0 0 4px; }.weekly-actions span { color:var(--text-muted); font-size:.86rem; }.btn-manage,.btn-primary,.btn-secondary { border:0; border-radius:8px; padding:9px 14px; cursor:pointer; font-weight:650; }.btn-manage,.btn-primary { background:var(--primary); color:white; }.btn-secondary { background:#e2e8f0; color:var(--text-main); }.modal-backdrop { position:fixed; inset:0; z-index:20; display:grid; place-items:center; padding:20px; background:rgba(15,23,42,.45); }.modal { width:min(100%, 500px); display:flex; flex-direction:column; gap:15px; padding:24px; background:white; border-radius:14px; }.modal-header { display:flex; justify-content:space-between; gap:16px; }.modal-header h3,.modal-header p { margin:0; }.modal-header p { margin-top:4px; color:var(--text-muted); font-size:.86rem; }.btn-close { border:0; background:none; font-size:1.8rem; cursor:pointer; } label { display:flex; flex-direction:column; gap:6px; font-size:.88rem; font-weight:650; } label input { padding:9px 11px; border:1px solid var(--border-color); border-radius:8px; font:inherit; }.categories-manager-list { border:1px solid var(--border-color); border-radius:9px; overflow:hidden; }.category-manager-row { display:flex; align-items:center; gap:9px; padding:10px 12px; border-bottom:1px solid var(--border-color); font-size:.88rem; }.category-manager-row:last-child { border:0; }.category-manager-row span { color:var(--text-muted); }.category-manager-row .btn-link:first-of-type { margin-left:auto; }.btn-link { border:0; background:none; color:var(--primary); cursor:pointer; font-weight:650; }.danger { color:#dc2626; }.modal-actions { display:flex; justify-content:flex-end; gap:10px; }

.amount-button { border:0; background:none; padding:0; cursor:pointer; color:var(--text-main); font:inherit; }
.amount-editor { display:flex; gap:4px; }.amount-editor input { width:72px; padding:4px; border:1px solid var(--border-color); border-radius:5px; }.amount-editor button { border:0; border-radius:5px; background:var(--primary); color:white; cursor:pointer; }

.btn-status-toggle {
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s;
}

.btn-status-toggle:active {
  transform: scale(0.95);
}

.btn-status-toggle.pagado { background: #22c55e; color: white; }
.btn-status-toggle.parado { background: #ef4444; color: white; }
.btn-status-toggle.esperando { background: #f59e0b; color: white; }
</style>

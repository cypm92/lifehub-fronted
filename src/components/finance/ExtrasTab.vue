<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '../../services/api'
type C = { id: number; name: string; color: string }
type E = {
  id: number
  concept: string
  description: string
  amount: number
  expense_date: string
  status: 'Pagado' | 'Pendiente'
  category_id?: number | null
  category_name?: string | null
}
const props = defineProps<{ monthCode: string }>(),
  emit = defineEmits<{ (e: 'refresh'): void }>()
const es = ref<E[]>([]),
  cs = ref<C[]>([]),
  showE = ref(false),
  showC = ref(false),
  eid = ref<number | null>(null),
  cid = ref<number | null>(null),
  f = ref({
    concept: '',
    description: '',
    amount: 0,
    expense_date: '',
    category_id: null as number | null,
  }),
  cf = ref({ name: '', color: '#7c3aed' })
const currentMonthExpenses = computed(() =>
  es.value.filter((x) => x.expense_date.slice(0, 7) === props.monthCode)
)
const futureExpenses = computed(() =>
  es.value.filter((x) => x.expense_date.slice(0, 7) > props.monthCode)
)
const total = computed(() => currentMonthExpenses.value.reduce((a, x) => a + x.amount, 0)),
  paid = computed(() =>
    currentMonthExpenses.value
      .filter((x) => x.status === 'Pagado')
      .reduce((a, x) => a + x.amount, 0)
  )
const load = async () => {
  const [a, b] = await Promise.all([
    api.get(`/extra-expenses/${props.monthCode}?include_scheduled=true`),
    api.get('/extra-expense-categories'),
  ])
  es.value = a.data
  cs.value = b.data
}
const closeE = () => {
  showE.value = false
  eid.value = null
  f.value = {
    concept: '',
    description: '',
    amount: 0,
    expense_date: `${props.monthCode}-01`,
    category_id: null,
  }
}
const openCreateExpense = () => {
  eid.value = null
  f.value = {
    concept: '',
    description: '',
    amount: 0,
    expense_date: `${props.monthCode}-01`,
    category_id: null,
  }
  showE.value = true
}
const saveE = async () => {
  try {
    const targetMonth = f.value.expense_date.slice(0, 7)
    if (eid.value === null) await api.post(`/extra-expenses?month_code=${props.monthCode}`, f.value)
    else await api.patch(`/extra-expenses/${eid.value}`, f.value)
    await load()
    emit('refresh')
    closeE()
    if (targetMonth && targetMonth !== props.monthCode) {
      alert('El gasto se ha guardado en el mes de su fecha seleccionada.')
    }
  } catch (error: any) {
    alert(
      error.response?.data?.detail ||
        'No se pudo guardar el gasto. Comprueba los datos introducidos.'
    )
  }
}
const edit = (x: E) => {
  eid.value = x.id
  f.value = {
    concept: x.concept,
    description: x.description,
    amount: x.amount,
    expense_date: x.expense_date,
    category_id: x.category_id || null,
  }
  showE.value = true
}
const toggle = async (x: E) => {
  await api.patch(`/extra-expenses/${x.id}/status`, {
    status: x.status === 'Pagado' ? 'Pendiente' : 'Pagado',
  })
  await load()
  emit('refresh')
}
const del = async (x: E) => {
  if (confirm(`¿Eliminar "${x.concept}"?`)) {
    await api.delete(`/extra-expenses/${x.id}`)
    await load()
  }
}
const saveC = async () => {
  if (cid.value === null) await api.post('/extra-expense-categories', cf.value)
  else await api.patch(`/extra-expense-categories/${cid.value}`, cf.value)
  cid.value = null
  cf.value = { name: '', color: '#7c3aed' }
  await load()
}
const editC = (x: C) => {
  cid.value = x.id
  cf.value = { name: x.name, color: x.color }
}
const delC = async (x: C) => {
  if (confirm(`¿Eliminar "${x.name}"?`)) {
    await api.delete(`/extra-expense-categories/${x.id}`)
    await load()
  }
}
watch(() => props.monthCode, load)
onMounted(load)
</script>
<template>
  <section class="card">
    <header>
      <div>
        <h3>Otros Gastos</h3>
        <p>Gastos puntuales de {{ monthCode }}</p>
      </div>
      <div>
        <button class="secondary" @click="showC = true">Gestionar categorías</button
        ><button class="primary" @click="openCreateExpense">+ Añadir gasto</button>
      </div>
    </header>
    <div class="metrics">
      <div>
        Previsto<b>{{ total.toFixed(2) }} €</b>
      </div>
      <div>
        Pagado<b>{{ paid.toFixed(2) }} €</b>
      </div>
      <div>
        Pendiente<b>{{ (total - paid).toFixed(2) }} €</b>
      </div>
    </div>
    <section v-if="currentMonthExpenses.length" class="current-card">
      <div class="future-header">
        <div>
          <h4>Gastos mes actual</h4>
          <span>Registrados en {{ monthCode }}</span>
        </div>
        <strong>{{ total.toFixed(2) }} €</strong>
      </div>
      <article v-for="x in currentMonthExpenses" :key="x.id">
        <button class="state" @click="toggle(x)">
          {{ x.status === 'Pagado' ? '✓ Pagado' : 'Pendiente' }}
        </button>
        <div class="info">
          <b>{{ x.concept }}</b
          ><span>{{ x.description }}</span
          ><small>{{ x.category_name || 'Sin categoría' }}</small>
        </div>
        <b>{{ x.amount.toFixed(2) }} €</b><button class="link" @click="edit(x)">Editar</button
        ><button class="link danger" @click="del(x)">Eliminar</button>
      </article>
    </section>
    <section v-if="futureExpenses.length" class="future-card">
      <div class="future-header">
        <div>
          <h4>Gastos futuros</h4>
          <span>Programados para meses posteriores</span>
        </div>
        <strong
          >{{ futureExpenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2) }} €</strong
        >
      </div>
      <article v-for="x in futureExpenses" :key="x.id" class="scheduled">
        <button class="state" @click="toggle(x)">
          {{ x.status === 'Pagado' ? '✓ Pagado' : 'Pendiente' }}
        </button>
        <div class="info">
          <b>{{ x.concept }}</b
          ><span class="scheduled-label">Gasto programado · {{ x.expense_date }}</span
          ><span>{{ x.description }}</span
          ><small>{{ x.category_name || 'Sin categoría' }}</small>
        </div>
        <b>{{ x.amount.toFixed(2) }} €</b><button class="link" @click="edit(x)">Editar</button
        ><button class="link danger" @click="del(x)">Eliminar</button>
      </article>
    </section>
  </section>
  <div v-if="showE" class="back" @click.self="closeE">
    <form class="modal" @submit.prevent="saveE">
      <div class="head">
        <h3>{{ eid === null ? 'Añadir gasto' : 'Editar gasto' }}</h3>
        <button type="button" class="close" @click="closeE">×</button>
      </div>
      <label>Nombre<input v-model.trim="f.concept" required /></label
      ><label>Descripción (opcional)<input v-model.trim="f.description" /></label>
      <div class="row">
        <label
          >Importe (€)<input v-model.number="f.amount" required type="number" step=".01" /></label
        ><label>Fecha<input v-model="f.expense_date" required type="date" /></label>
      </div>
      <label
        >Categoría<select v-model="f.category_id">
          <option :value="null">Sin categoría</option>
          <option v-for="c in cs" :value="c.id">{{ c.name }}</option>
        </select></label
      >
      <footer>
        <button type="button" class="secondary" @click="closeE">Cancelar</button
        ><button class="primary">Guardar</button>
      </footer>
    </form>
  </div>
  <div v-if="showC" class="back" @click.self="showC = false">
    <section class="modal">
      <div class="head">
        <h3>Gestionar categorías</h3>
        <button class="close" @click="showC = false">×</button>
      </div>
      <div v-for="c in cs" class="cat">
        <b>{{ c.name }}</b
        ><button class="link" @click="editC(c)">Editar</button
        ><button class="link danger" @click="delC(c)">Eliminar</button>
      </div>
      <form @submit.prevent="saveC">
        <label>Nombre de la categoría<input v-model.trim="cf.name" required /></label
        ><label>Color<input v-model="cf.color" type="color" /></label
        ><button class="primary">{{ cid === null ? 'Crear categoría' : 'Actualizar' }}</button>
      </form>
    </section>
  </div>
</template>
<style scoped>
.card {
  background: #fff;
  padding: 24px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}
header,
header > div,
article,
.metrics,
footer,
.head,
.cat {
  display: flex;
  align-items: center;
  gap: 10px;
}
header {
  justify-content: space-between;
}
h3,
p {
  margin: 0;
}
p,
small,
.info span {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.primary,
.secondary {
  border: 0;
  border-radius: 8px;
  padding: 9px 13px;
  font-weight: 700;
  cursor: pointer;
}
.primary {
  background: var(--primary);
  color: #fff;
}
.secondary {
  background: #e2e8f0;
}
.metrics {
  margin: 18px 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}
.metrics div {
  flex: 1;
  padding: 12px;
}
.metrics b {
  display: block;
  margin-top: 4px;
}
article {
  padding: 14px 4px;
  border-top: 1px solid var(--border-color);
}
.scheduled {
  background: #faf5ff;
}
.future-card {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  background: #fcfaff;
}
.current-card {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #fff;
}
.future-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.future-header h4,
.future-header span {
  margin: 0;
}
.future-header span {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.scheduled-label {
  margin-top: 3px;
  color: #7c3aed;
  font-size: 0.78rem;
  font-weight: 700;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.state {
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  background: #dcfce7;
  color: #15803d;
  font-weight: 700;
}
.link,
.close {
  border: 0;
  background: none;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
}
.danger {
  color: #dc2626;
}
.back {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: #0f172a70;
}
.modal {
  width: min(520px, calc(100% - 40px));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  background: #fff;
  border-radius: 14px;
}
.head {
  justify-content: space-between;
}
.close {
  font-size: 28px;
  color: #111;
}
.modal label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 700;
  font-size: 0.88rem;
}
.modal input,
.modal select {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font: inherit;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal footer {
  justify-content: flex-end;
}
.cat {
  padding: 9px 0;
  border-bottom: 1px solid var(--border-color);
}
.cat b {
  flex: 1;
}
</style>

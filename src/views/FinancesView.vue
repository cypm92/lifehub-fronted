<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface Transaction {
  id: number
  concept: string
  type: string
  amount: number
  user_id: number
}

const users = ref<User[]>([])
const transactions = ref<Transaction[]>([])

const newUser = ref({ name: '', email: '', role: 'editor' })
const newTransaction = ref({
  concept: '',
  amount: 0,
  type: 'gasto_fijo',
  user_id: null as number | null
})

// Carga de datos
const fetchData = async () => {
  try {
    const resTrans = await api.get('/transactions')
    transactions.value = resTrans.data

    try {
      const resUsers = await api.get('/users')
      users.value = resUsers.data
    } catch {
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (loggedUser?.id) users.value = [loggedUser]
    }

    if (users.value.length > 0 && !newTransaction.value.user_id) {
      newTransaction.value.user_id = users.value[0]?.id ?? null
    }
  } catch (error) {
    console.error("Error al conectar con el backend:", error)
  }
}

// CÁLCULOS PARA LAS TARJETAS KPI
const totalIncome = computed(() => {
  return transactions.value
      .filter(t => t.type === 'ingreso')
      .reduce((acc, t) => acc + t.amount, 0)
})

const totalExpenses = computed(() => {
  return transactions.value
      .filter(t => t.type !== 'ingreso')
      .reduce((acc, t) => acc + t.amount, 0)
})

const totalBalance = computed(() => totalIncome.value - totalExpenses.value)

const createTransaction = async () => {
  if (!newTransaction.value.concept || newTransaction.value.amount <= 0) return
  try {
    await api.post('/transactions', newTransaction.value)
    newTransaction.value.concept = ''
    newTransaction.value.amount = 0
    await fetchData()
  } catch (error: any) {
    alert(error.response?.data?.detail || "Error al registrar movimiento")
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div>
        <h1>Analytics</h1>
        <p class="subtitle">Visión general y detallada de tus finanzas</p>
      </div>
      <button class="btn-primary">+ Nuevo Movimiento</button>
    </header>

    <!-- KPI Summary Cards (Estilo FinSet) -->
    <div class="kpi-grid">
      <!-- Total Balance -->
      <div class="card kpi-card">
        <div class="kpi-header">
          <span>Balance Total</span>
          <span class="currency-tag">EUR</span>
        </div>
        <div class="kpi-amount">{{ totalBalance.toFixed(2) }} €</div>
        <div class="kpi-footer">
          <span class="badge success">↑ 12%</span>
          <span class="kpi-subtext">{{ transactions.length }} transacciones</span>
        </div>
      </div>

      <!-- Income -->
      <div class="card kpi-card">
        <div class="kpi-header">
          <span>Ingresos</span>
          <span class="currency-tag">EUR</span>
        </div>
        <div class="kpi-amount">{{ totalIncome.toFixed(2) }} €</div>
        <div class="kpi-footer">
          <span class="badge success">↑ Ingresos del mes</span>
        </div>
      </div>

      <!-- Expense -->
      <div class="card kpi-card">
        <div class="kpi-header">
          <span>Gastos Totales</span>
          <span class="currency-tag">EUR</span>
        </div>
        <div class="kpi-amount">{{ totalExpenses.toFixed(2) }} €</div>
        <div class="kpi-footer">
          <span class="badge danger">↓ Gastos acumulados</span>
        </div>
      </div>
    </div>

    <!-- Contenido Principal: Formulario e Historial -->
    <div class="content-grid">
      <!-- Formulario Nuevo Movimiento -->
      <div class="card">
        <h3>Registrar Movimiento</h3>
        <form @submit.prevent="createTransaction" class="form-stack">
          <div class="form-group">
            <label>Usuario</label>
            <select v-model="newTransaction.user_id" class="input" required>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.role }})</option>
            </select>
          </div>

          <div class="form-group">
            <label>Concepto</label>
            <input v-model="newTransaction.concept" class="input" placeholder="Ej. Compra supermercado" required />
          </div>

          <div class="form-group">
            <label>Importe (€)</label>
            <input v-model.number="newTransaction.amount" type="number" step="0.01" class="input" required />
          </div>

          <div class="form-group">
            <label>Tipo</label>
            <select v-model="newTransaction.type" class="input">
              <option value="ingreso">Ingreso</option>
              <option value="gasto_fijo">Gasto Fijo</option>
              <option value="gasto_semanal">Gasto Semanal</option>
              <option value="gasto_extra">Gasto Extra</option>
            </select>
          </div>

          <button type="submit" class="btn-primary width-full">Añadir</button>
        </form>
      </div>

      <!-- Historial de Transacciones -->
      <div class="card">
        <h3>Historial Reciente</h3>
        <table class="clean-table">
          <thead>
          <tr>
            <th>Concepto</th>
            <th>Tipo</th>
            <th>Importe</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="t in transactions" :key="t.id">
            <td><strong>{{ t.concept }}</strong></td>
            <td><span class="type-pill">{{ t.type }}</span></td>
            <td :class="t.type === 'ingreso' ? 'text-success' : 'text-danger'">
              {{ t.type === 'ingreso' ? '+' : '-' }}{{ t.amount.toFixed(2) }} €
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { padding: 30px; }
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
.dashboard-header h1 { margin: 0; font-size: 1.8rem; font-weight: 700; }
.subtitle { margin: 5px 0 0 0; color: var(--text-muted); font-size: 0.9rem; }

/* Grid de tarjetas KPI */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.card {
  background: white;
  padding: 24px;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--border-color);
}

.kpi-header { display: flex; justify-content: space-between; color: var(--text-muted); font-weight: 500; }
.currency-tag { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; }
.kpi-amount { font-size: 2rem; font-weight: 800; margin: 15px 0; color: var(--text-main); }
.kpi-footer { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }

/* Badges */
.badge { padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
.badge.success { background: var(--success-bg); color: var(--success-text); }
.badge.danger { background: var(--danger-bg); color: var(--danger-text); }

/* Layout de Contenido */
.content-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
}

.form-stack { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
.input {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: #f8fafc;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { background: var(--primary-hover); }
.width-full { width: 100%; }

/* Tablas limpias */
.clean-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
.clean-table th { text-align: left; padding: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.clean-table td { padding: 14px 12px; border-bottom: 1px solid var(--border-color); }
.type-pill { background: #f1f5f9; padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; text-transform: capitalize; }
.text-success { color: var(--success-text); font-weight: 700; }
.text-danger { color: var(--danger-text); font-weight: 700; }
</style>
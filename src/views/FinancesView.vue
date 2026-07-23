<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
  created_at?: string
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

const fetchData = async () => {
  try {
    // 1. Cargar movimientos financieros
    const resTrans = await api.get('/transactions')
    transactions.value = resTrans.data

    // 2. Intentar cargar lista de usuarios o usar el usuario activo
    try {
      const resUsers = await api.get('/users')
      users.value = resUsers.data
    } catch {
      // Si no existe la lista pública de usuarios, usamos el usuario del localStorage
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (loggedUser && loggedUser.id) {
        users.value = [loggedUser]
      }
    }

    // Seleccionar por defecto el primer usuario en el formulario
    if (users.value.length > 0 && !newTransaction.value.user_id) {
      newTransaction.value.user_id = users.value[0]?.id ?? null
    }
  } catch (error) {
    console.error("Error al conectar con el backend:", error)
  }
}

const createUser = async () => {
  if (!newUser.value.name || !newUser.value.email) return
  try {
    // Registramos al nuevo usuario enviando una contraseña por defecto
    await api.post('/auth/register', {
      ...newUser.value,
      password: 'password123'
    })
    newUser.value = { name: '', email: '', role: 'editor' }
    await fetchData()
  } catch (error: any) {
    alert(error.response?.data?.detail || "Error al crear usuario")
  }
}

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
  <div>
    <h1>💰 Gestión Financiera</h1>

    <!-- 1. CREAR USUARIO -->
    <div class="card">
      <h2>1. Crear Perfil / Usuario</h2>
      <form @submit.prevent="createUser" class="form-row">
        <input v-model="newUser.name" placeholder="Nombre (ej. CYP)" required />
        <input v-model="newUser.email" type="email" placeholder="Email" required />
        <select v-model="newUser.role">
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="guest">Invitado</option>
        </select>
        <button type="submit">Guardar Usuario</button>
      </form>
    </div>

    <!-- 2. MOVIMIENTOS -->
    <div class="card">
      <h2>2. Registrar Movimiento</h2>
      <form @submit.prevent="createTransaction" class="form-row">
        <select v-model="newTransaction.user_id" required>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }} ({{ user.role }})
          </option>
        </select>

        <input v-model="newTransaction.concept" placeholder="Concepto" required />
        <input v-model.number="newTransaction.amount" type="number" step="0.01" placeholder="Importe (€)" required />

        <select v-model="newTransaction.type">
          <option value="ingreso">Ingreso</option>
          <option value="gasto_fijo">Gasto Fijo</option>
          <option value="gasto_semanal">Gasto Semanal</option>
          <option value="gasto_extra">Gasto Extra</option>
        </select>

        <button type="submit" :disabled="users.length === 0">Añadir Movimiento</button>
      </form>
    </div>

    <!-- 3. HISTORIAL -->
    <div class="card">
      <h2>3. Historial de Movimientos</h2>
      <table>
        <thead>
        <tr>
          <th>ID</th>
          <th>Concepto</th>
          <th>Tipo</th>
          <th>Importe</th>
          <th>Usuario ID</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="t in transactions" :key="t.id">
          <td>{{ t.id }}</td>
          <td>{{ t.concept }}</td>
          <td><span class="badge">{{ t.type }}</span></td>
          <td :class="t.type === 'ingreso' ? 'income' : 'expense'">
            {{ t.type === 'ingreso' ? '+' : '-' }}{{ t.amount.toFixed(2) }} €
          </td>
          <td>{{ t.user_id }}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.form-row { display: flex; gap: 10px; flex-wrap: wrap; }
input, select, button { padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
button { background-color: #2e7d32; color: white; border: none; cursor: pointer; }
button:disabled { background-color: #a5d6a7; cursor: not-allowed; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #eee; padding: 10px; text-align: left; }
.income { color: green; font-weight: bold; }
.expense { color: red; font-weight: bold; }
.badge { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; }
</style>
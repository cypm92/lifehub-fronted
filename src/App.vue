<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000'

// Estados del formulario y datos
const users = ref([])
const transactions = ref([])

// Formulario nuevo usuario
const newUser = ref({ name: '', email: '', role: 'editor' })

// Formulario nueva transacción
const newTransaction = ref({
  concept: '',
  amount: 0,
  type: 'gasto_fijo',
  user_id: null
})

// Cargar usuarios y transacciones al iniciar
const fetchData = async () => {
  try {
    const resUsers = await axios.get(`${API_URL}/users`)
    users.value = resUsers.data

    const resTrans = await axios.get(`${API_URL}/transactions`)
    transactions.value = resTrans.data

    if (users.value.length > 0 && !newTransaction.value.user_id) {
      newTransaction.value.user_id = users.value[0].id
    }
  } catch (error) {
    console.error("Error al conectar con el backend:", error)
  }
}

// Crear Usuario
const createUser = async () => {
  if (!newUser.value.name || !newUser.value.email) return
  try {
    await axios.post(`${API_URL}/users`, newUser.value)
    newUser.value = { name: '', email: '', role: 'editor' }
    await fetchData()
  } catch (error) {
    alert(error.response?.data?.detail || "Error al crear usuario")
  }
}

// Crear Transacción
const createTransaction = async () => {
  if (!newTransaction.value.concept || newTransaction.value.amount <= 0) return
  try {
    await axios.post(`${API_URL}/transactions`, newTransaction.value)
    newTransaction.value.concept = ''
    newTransaction.value.amount = 0
    await fetchData()
  } catch (error) {
    alert(error.response?.data?.detail || "Error al registrar movimiento")
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="container">
    <h1>💰 Control Financiero</h1>

    <!-- 1. SECCIÓN DE USUARIOS -->
    <div class="card">
      <h2>1. Crear Perfil / Usuario</h2>
      <form @submit.prevent="createUser" class="form-row">
        <input v-model="newUser.name" placeholder="Nombre (ej. CYP, Madre)" required />
        <input v-model="newUser.email" type="email" placeholder="Email" required />
        <select v-model="newUser.role">
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="guest">Invitado</option>
        </select>
        <button type="submit">Guardar Usuario</button>
      </form>
    </div>

    <!-- 2. SECCIÓN DE REGISTRO DE GASTOS / INGRESOS -->
    <div class="card">
      <h2>2. Registrar Movimiento</h2>
      <form @submit.prevent="createTransaction" class="form-row">
        <select v-model="newTransaction.user_id" required>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }} ({{ user.role }})
          </option>
        </select>

        <input v-model="newTransaction.concept" placeholder="Concepto (ej. Alquiler, Supermercado)" required />
        <input v-model.number="newTransaction.amount" type="number" step="0.01" placeholder="Importe (€)" required />

        <select v-model="newTransaction.type">
          <option value="ingreso">Ingreso (Nómina)</option>
          <option value="gasto_fijo">Gasto Fijo</option>
          <option value="gasto_semanal">Gasto Semanal</option>
          <option value="gasto_extra">Gasto Extra</option>
        </select>

        <button type="submit" :disabled="users.length === 0">
          Añadir Movimiento
        </button>
      </form>
      <p v-if="users.length === 0" class="warning">⚠️ Primero debes crear al menos un usuario.</p>
    </div>

    <!-- 3. TABLA DE REGISTROS -->
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
          <td><span class="badge" :class="t.type">{{ t.type }}</span></td>
          <td :class="t.type === 'ingreso' ? 'income' : 'expense'">
            {{ t.type === 'ingreso' ? '+' : '-' }}{{ t.amount.toFixed(2) }} €
          </td>
          <td>{{ t.user_id }}</td>
        </tr>
        <tr v-if="transactions.length === 0">
          <td colspan="5" style="text-align: center;">No hay movimientos registrados.</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #333;
}

.card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

input, select, button {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

.income { color: green; font-weight: bold; }
.expense { color: red; font-weight: bold; }

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  background: #eee;
}

.warning {
  color: #d9534f;
  margin-top: 10px;
}
</style>
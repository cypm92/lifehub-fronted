<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const isRegister = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('admin') // Por defecto la primera cuenta será Admin
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  try {
    if (isRegister.value) {
      // Registrar usuario con el rol seleccionado
      await api.post('/auth/register', {
        name: name.value,
        email: email.value,
        password: password.value,
        role: role.value
      })
    }

    // Iniciar Sesión
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value
    })

    // Guardar Token y datos del Usuario
    localStorage.setItem('token', response.data.access_token)
    localStorage.setItem('user', JSON.stringify(response.data.user))

    // Redirigir al panel principal
    router.push('/finances')
  } catch (err: any) {
    errorMessage.value = err.response?.data?.detail || 'Error al procesar la solicitud'
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h2>🌐 LifeHub</h2>
      <h3>{{ isRegister ? 'Crear Cuenta' : 'Iniciar Sesión' }}</h3>

      <div v-if="errorMessage" class="error-badge">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="isRegister" class="form-group">
          <label>Nombre completo</label>
          <input v-model="name" type="text" placeholder="Ej: CYP" required />
        </div>

        <div class="form-group">
          <label>Correo Electrónico</label>
          <input v-model="email" type="email" placeholder="usuario@correo.com" required />
        </div>

        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>

        <button type="submit" class="btn-primary">
          {{ isRegister ? 'Registrarse y Entrar' : 'Entrar' }}
        </button>
      </form>

      <p class="toggle-mode">
        {{ isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?' }}
        <a href="#" @click.prevent="isRegister = !isRegister">
          {{ isRegister ? 'Inicia sesión aquí' : 'Regístrate' }}
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #0f172a;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.login-card h2 { color: #2563eb; margin-bottom: 5px; }
.login-card h3 { margin-bottom: 25px; color: #334155; }

.login-form { display: flex; flex-direction: column; gap: 15px; text-align: left; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 0.9rem; font-weight: 600; color: #475569; }
.form-group input, .select-input {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
}

.btn-primary {
  margin-top: 10px;
  padding: 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}
.btn-primary:hover { background: #1d4ed8; }

.error-badge {
  background-color: #fee2e2;
  color: #dc2626;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.toggle-mode { margin-top: 20px; font-size: 0.9rem; color: #64748b; }
.toggle-mode a { color: #2563eb; text-decoration: none; font-weight: bold; }
</style>
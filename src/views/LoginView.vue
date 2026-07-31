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
        role: role.value,
      })
    }

    // Iniciar Sesión
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
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
      <div class="login-brand"><span>LH</span>LifeHub</div>
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
  background:
    radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.18), transparent 32%),
    radial-gradient(circle at 85% 80%, rgba(14, 165, 233, 0.12), transparent 28%), #111827;
}

.login-card {
  background: rgba(255, 255, 255, 0.98);
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.login-card h3 {
  margin: 18px 0 24px;
  color: var(--text-main);
  font-size: 1.15rem;
}
.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--text-main);
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.login-brand span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: var(--primary);
  color: white;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}
.form-group input,
.select-input {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  font-size: 0.92rem;
  outline: none;
}
.form-group input:focus,
.select-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.btn-primary {
  margin-top: 10px;
  padding: 11px;
  border-radius: 9px;
}
.btn-primary:hover {
  background: var(--primary-hover);
}

.error-badge {
  background-color: #fee2e2;
  color: #dc2626;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.82rem;
  margin-bottom: 15px;
}

.toggle-mode {
  margin-top: 20px;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.toggle-mode a {
  color: var(--primary);
  text-decoration: none;
  font-weight: bold;
}
</style>

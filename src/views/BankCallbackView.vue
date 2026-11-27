<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const message = ref('Completando la conexión bancaria…')
const failed = ref(false)

onMounted(async () => {
  let query: Record<string, unknown> = { ...route.query }
  const saved = sessionStorage.getItem('bankCallback')
  sessionStorage.removeItem('bankCallback')
  if (saved && !query.code && !query.error) {
    try { query = JSON.parse(saved) as Record<string, unknown> } catch { query = {} }
  }
  // No mantener el código de un solo uso en la barra ni en el historial.
  window.history.replaceState(window.history.state, '', route.path)
  const state = query.state
  const code = query.code
  const error = query.error
  if (typeof state !== 'string' || !state ||
      (typeof code !== 'string' && typeof error !== 'string') ||
      (typeof code === 'string' && typeof error === 'string') ||
      Array.isArray(code) || Array.isArray(error)) {
    failed.value = true
    message.value = 'La respuesta del banco no es válida. Inicia una nueva autorización o pega la URL de retorno.'
    return
  }
  try {
    await api.post('/banks/callback', { state, ...(typeof code === 'string' ? { code } : { error }) })
    await router.replace({ path: '/banks', query: { connected: '1' } })
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      // El código aún no se ha canjeado: reanudar después de iniciar sesión.
      sessionStorage.setItem('bankCallback', JSON.stringify(query))
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      await router.replace('/login')
      return
    }
    failed.value = true
    const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined
    message.value = typeof detail === 'string' ? detail : 'No se pudo completar la conexión. Inicia una nueva autorización.'
  }
})
</script>

<template>
  <div class="callback-page">
    <section class="card" role="status">
      <h1>Conexión bancaria</h1>
      <p>{{ message }}</p>
      <RouterLink v-if="failed" to="/banks">Volver a Bancos</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.callback-page { padding: 32px; }
.card { max-width: 640px; }
h1 { margin-top: 0; }
p { color: var(--text-muted); }
a { color: var(--primary); font-weight: 700; }
</style>

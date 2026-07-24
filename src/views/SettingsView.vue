<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '../services/api'
const form = ref({ name: '', email: '' })
const message = ref('')
onMounted(async () => {
  const { data } = await api.get('/auth/me')
  form.value = { name: data.name, email: data.email }
})
const save = async () => {
  const { data } = await api.patch('/auth/me', form.value)
  localStorage.setItem('user', JSON.stringify(data))
  message.value = 'Información guardada correctamente.'
}
</script>
<template>
  <main class="settings">
    <section>
      <h2>Configuración de usuario</h2>
      <p>Actualiza la información de tu cuenta.</p>
      <form @submit.prevent="save">
        <label>Nombre<input v-model.trim="form.name" required /></label
        ><label>Email<input v-model.trim="form.email" required type="email" /></label
        ><button>Guardar cambios</button>
      </form>
      <span v-if="message">{{ message }}</span>
    </section>
  </main>
</template>
<style scoped>
.settings {
  padding: 32px;
  background: var(--bg-app);
  min-height: 100vh;
}
.settings section {
  max-width: 560px;
  padding: 28px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}
.settings h2,
.settings p {
  margin: 0;
}
.settings p {
  margin-top: 6px;
  color: var(--text-muted);
}
form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 24px 0;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 650;
}
input {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font: inherit;
}
button {
  align-self: flex-start;
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
</style>

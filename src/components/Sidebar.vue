<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const user = computed(() => JSON.parse(localStorage.getItem('user') || '{}'))

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar">
    <router-link to="/settings" class="brand" :class="{ active: route.path === '/settings' }">
      <div class="brand-logo">⚙</div>
      <div><span class="brand-name">{{ user.name || 'Configuración' }}</span><small>{{ user.email || 'Gestionar perfil' }}</small></div>
    </router-link>

    <!-- Menú de Navegación -->
    <nav class="nav-menu">
      <router-link to="/finances" class="nav-item" :class="{ active: route.path === '/finances' }">
        <span class="icon">📊</span> Finanzas
      </router-link>
      <router-link to="/vehicles" class="nav-item" :class="{ active: route.path === '/vehicles' }">
        <span class="icon">🚗</span> Vehículos
      </router-link>
      <router-link to="/vault" class="nav-item" :class="{ active: route.path === '/vault' }">
        <span class="icon">🔐</span> Bóveda
      </router-link>
      <router-link to="/calendar" class="nav-item" :class="{ active: route.path === '/calendar' }">
        <span class="icon">📅</span> Calendario
      </router-link>
    </nav>

    <!-- Pie del Menú -->
    <div class="sidebar-footer">
      <button @click="logout" class="btn-logout">
        <span class="icon">🚪</span> Cerrar Sesión
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: white;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border-right: 1px solid var(--border-color);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 36px;
  color: var(--text-main);
  text-decoration: none;
}

.brand-logo {
  width: 38px;
  height: 38px;
  background: black;
  color: white;
  font-weight: 800;
  font-size: 1.35rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  display: block;
  font-weight: 700;
  font-size: 1.25rem;
}

.brand small { display:block; max-width:145px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-muted); font-size:.72rem; }

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-grow: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: var(--radius-pill);
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--bg-app);
  color: var(--text-main);
}

.nav-item.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
}

.sidebar-footer {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 500;
}

.btn-logout:hover {
  color: var(--danger-text);
}
</style>

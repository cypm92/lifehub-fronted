<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
      <span class="brand-mark" aria-hidden="true">LH</span>
      <span class="profile-copy">
        <strong>{{ user.name || 'Configuración' }}</strong>
        <small>{{ user.email || 'Gestionar perfil' }}</small>
      </span>
      <svg class="settings-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
        <path
          d="M19.4 13.5a7.5 7.5 0 0 0 .05-1.5 7.5 7.5 0 0 0-.05-1.5l2-1.55-2-3.46-2.35.95a7.8 7.8 0 0 0-2.6-1.5L14.1 2.4h-4L9.75 4.9a7.8 7.8 0 0 0-2.6 1.5L4.8 5.45 2.8 8.9l2 1.55a7.5 7.5 0 0 0-.05 1.5 7.5 7.5 0 0 0 .05 1.5l-2 1.55 2 3.46 2.35-.95a7.8 7.8 0 0 0 2.6 1.5l.35 2.5h4l.35-2.5a7.8 7.8 0 0 0 2.6-1.5l2.35.95 2-3.46-2.05-1.55Z"
        />
      </svg>
    </router-link>

    <nav class="nav-menu" aria-label="Navegación principal">
      <router-link to="/finances" class="nav-item" :class="{ active: route.path === '/finances' }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg
        ><span>Finanzas</span>
      </router-link>
      <div v-if="route.path === '/finances'" class="finance-submenu">
        <router-link to="/finances?tab=fijos">Gastos fijos</router-link>
        <router-link to="/finances?tab=semanal">Gastos semanales</router-link>
        <router-link to="/finances?tab=extras">Otros gastos</router-link>
        <router-link to="/finances?tab=ahorros">Ahorros</router-link>
      </div>
      <router-link to="/vehicles" class="nav-item" :class="{ active: route.path === '/vehicles' }">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 2-5h10l2 5M4 12h16v6H4zM7 18v2m10-2v2M7 15h.01M17 15h.01" /></svg
        ><span>Vehículos</span>
      </router-link>
      <router-link to="/vault" class="nav-item" :class="{ active: route.path === '/vault' }">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M12 11v5m-2.5-2.5h5" /></svg
        ><span>Bóveda</span>
      </router-link>
      <router-link to="/calendar" class="nav-item" :class="{ active: route.path === '/calendar' }">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4m10-4v4M3 10h18" /></svg
        ><span>Calendario</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button class="btn-logout" @click="logout">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 17l5-5-5-5m5 5H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        </svg>
        Cerrar sesión
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 248px;
  flex: 0 0 248px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 22px 14px;
  background: #fff;
  border-right: 1px solid var(--border-color);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 22px;
  margin-bottom: 14px;
  color: var(--text-main);
  text-decoration: none;
  border-bottom: 1px solid var(--border-color);
}
.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #172033;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.profile-copy {
  min-width: 0;
  flex: 1;
}
.profile-copy strong,
.profile-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-copy strong {
  font-size: 0.92rem;
}
.profile-copy small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 0.7rem;
}
.settings-icon {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.nav-menu {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 9px;
  color: #526078;
  text-decoration: none;
  font-weight: 650;
}
.nav-item svg,
.btn-logout svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.nav-item:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
}
.nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
}
.finance-submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 2px 0 8px 20px;
  padding: 2px 0 2px 15px;
  border-left: 1px solid #dbe3ee;
}
.finance-submenu a {
  padding: 6px 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
}
.finance-submenu a:hover,
.finance-submenu a.router-link-exact-active {
  color: var(--primary);
}
.sidebar-footer {
  padding: 15px 8px 0;
  border-top: 1px solid var(--border-color);
}
.btn-logout {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 4px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 600;
  text-align: left;
}
.btn-logout:hover {
  color: var(--danger);
}
</style>

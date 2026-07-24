import { createRouter, createWebHistory } from 'vue-router'
import FinancesView from '../views/FinancesView.vue'
import VehiclesView from '../views/VehiclesView.vue'
import CalendarView from '../views/CalendarView.vue'
import VaultView from '../views/VaultView.vue'
import LoginView from '../views/LoginView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/', redirect: '/finances' },
  { path: '/finances', name: 'Finances', component: FinancesView },
  { path: '/vehicles', name: 'Vehicles', component: VehiclesView },
  { path: '/calendar', name: 'Calendar', component: CalendarView },
  { path: '/vault', name: 'Vault', component: VaultView },
  { path: '/settings', name: 'Settings', component: SettingsView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Control de Acceso: Redirige a Login si no hay Token guardado
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.name !== 'Login' && !token) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Finances' })
  } else {
    next()
  }
})

export default router

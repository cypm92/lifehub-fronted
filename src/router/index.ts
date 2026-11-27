import { createRouter, createWebHistory } from 'vue-router'
import FinancesView from '../views/FinancesView.vue'
import VehiclesView from '../views/VehiclesView.vue'
import CalendarView from '../views/CalendarView.vue'
import VaultView from '../views/VaultView.vue'
import LoginView from '../views/LoginView.vue'
import SettingsView from '../views/SettingsView.vue'
import BanksView from '../views/BanksView.vue'
import BankCallbackView from '../views/BankCallbackView.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/', redirect: '/finances' },
  { path: '/finances', name: 'Finances', component: FinancesView },
  { path: '/vehicles', name: 'Vehicles', component: VehiclesView },
  { path: '/calendar', name: 'Calendar', component: CalendarView },
  { path: '/vault', name: 'Vault', component: VaultView },
  { path: '/settings', name: 'Settings', component: SettingsView },
  { path: '/banks', name: 'Banks', component: BanksView },
  { path: '/banks/callback', name: 'BankCallback', component: BankCallbackView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Control de Acceso: Redirige a Login si no hay Token guardado
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.name !== 'Login' && !token) {
    // Conserva el retorno solo durante el inicio de sesión y retíralo de la URL.
    if (to.name === 'BankCallback' && (to.query.code || to.query.error)) {
      sessionStorage.setItem('bankCallback', JSON.stringify(to.query))
      window.history.replaceState(window.history.state, '', '/login')
    }
    next({ name: 'Login' })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Finances' })
  } else {
    next()
  }
})

export default router

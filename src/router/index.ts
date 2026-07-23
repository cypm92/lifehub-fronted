import { createRouter, createWebHistory } from 'vue-router'
import FinancesView from '../views/FinancesView.vue'
import VehiclesView from '../views/VehiclesView.vue'
import CalendarView from '../views/CalendarView.vue'
import VaultView from '../views/VaultView.vue'

const routes = [
    { path: '/', redirect: '/finances' },
    { path: '/finances', name: 'Finances', component: FinancesView },
    { path: '/vehicles', name: 'Vehicles', component: VehiclesView },
    { path: '/calendar', name: 'Calendar', component: CalendarView },
    { path: '/vault', name: 'Vault', component: VaultView },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
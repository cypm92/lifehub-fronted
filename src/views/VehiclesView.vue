<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

interface Vehicle {
  id: number
  brand: string
  model: string
  license_plate: string
  year: number | null
  fuel_type: string | null
  current_km: number
  vin: string | null
  insurance_expiry: string | null
  itv_expiry: string | null
  notes: string
}
interface Expense {
  id: number
  category: string
  description: string
  amount: number
  expense_date: string
  mileage: number | null
  workshop: string | null
}
interface Maintenance {
  id: number
  title: string
  description: string
  completed_date: string | null
  completed_km: number | null
  next_date: string | null
  next_km: number | null
  cost: number | null
  workshop: string | null
}
interface Reminder {
  id: number
  title: string
  next_date: string | null
  next_km: number | null
  status: 'Vencido' | 'Próximo' | 'Planificado'
}

const vehicles = ref<Vehicle[]>([])
const selectedId = ref<number | null>(null)
const dashboard = ref<{
  vehicle: Vehicle
  expenses: Expense[]
  maintenance: Maintenance[]
  total_cost: number
  upcoming: Reminder[]
} | null>(null)
const showVehicleForm = ref(false)
const showExpenseForm = ref(false)
const showMaintenanceForm = ref(false)
const editingVehicle = ref(false)
const editingExpenseId = ref<number | null>(null)
const loading = ref(false)
const loadError = ref('')

const vehicleForm = ref({
  brand: '',
  model: '',
  license_plate: '',
  year: null as number | null,
  fuel_type: '',
  current_km: 0,
  vin: '',
  insurance_expiry: '',
  itv_expiry: '',
  notes: '',
})
const expenseForm = ref({
  category: 'Taller',
  description: '',
  amount: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  mileage: null as number | null,
  workshop: '',
  notes: '',
  vehicle_id: null as number | null,
})
const maintenanceForm = ref({
  title: '',
  description: '',
  completed_date: '',
  completed_km: null as number | null,
  next_date: '',
  next_km: null as number | null,
  cost: null as number | null,
  workshop: '',
  notes: '',
})

const selectedVehicle = computed(() => dashboard.value?.vehicle || null)
const money = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat('es-ES').format(new Date(`${value}T00:00:00`)) : 'Sin fecha'
const vehicleName = (vehicle: Vehicle) => `${vehicle.brand} ${vehicle.model}`

const nullable = (value: string) => value || null
const vehiclePayload = () => ({
  ...vehicleForm.value,
  fuel_type: nullable(vehicleForm.value.fuel_type),
  vin: nullable(vehicleForm.value.vin),
  insurance_expiry: nullable(vehicleForm.value.insurance_expiry),
  itv_expiry: nullable(vehicleForm.value.itv_expiry),
})

const loadVehicles = async (retries = 1) => {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await api.get<Vehicle[]>('/vehicles')
    vehicles.value = data
    if (!selectedId.value && data.length) selectedId.value = data[0]?.id || null
    if (selectedId.value && !data.some((vehicle) => vehicle.id === selectedId.value))
      selectedId.value = data[0]?.id || null
    if (selectedId.value) await loadDashboard()
    else dashboard.value = null
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 700))
      return loadVehicles(retries - 1)
    }
    loadError.value = 'No se pudieron cargar los vehículos. Comprueba la conexión con el servidor.'
  } finally {
    loading.value = false
  }
}
const loadDashboard = async () => {
  if (!selectedId.value) return
  loading.value = true
  try {
    dashboard.value = (await api.get(`/vehicles/${selectedId.value}/dashboard`)).data
  } finally {
    loading.value = false
  }
}
const selectVehicle = async (id: number) => {
  selectedId.value = id
  await loadDashboard()
}
const resetVehicle = () => {
  editingVehicle.value = false
  vehicleForm.value = {
    brand: '',
    model: '',
    license_plate: '',
    year: null,
    fuel_type: '',
    current_km: 0,
    vin: '',
    insurance_expiry: '',
    itv_expiry: '',
    notes: '',
  }
}
const openCreateVehicle = () => {
  resetVehicle()
  showVehicleForm.value = true
}
const openEditVehicle = () => {
  if (!selectedVehicle.value) return
  editingVehicle.value = true
  vehicleForm.value = {
    ...selectedVehicle.value,
    fuel_type: selectedVehicle.value.fuel_type || '',
    vin: selectedVehicle.value.vin || '',
    insurance_expiry: selectedVehicle.value.insurance_expiry || '',
    itv_expiry: selectedVehicle.value.itv_expiry || '',
  }
  showVehicleForm.value = true
}
const saveVehicle = async () => {
  try {
    if (editingVehicle.value && selectedId.value)
      await api.patch(`/vehicles/${selectedId.value}`, vehiclePayload())
    else {
      const { data } = await api.post('/vehicles', vehiclePayload())
      selectedId.value = data.id
    }
    showVehicleForm.value = false
    await loadVehicles()
  } catch (error: any) {
    alert(error.response?.data?.detail || 'No se pudo guardar el vehículo')
  }
}
const removeVehicle = async () => {
  if (
    !selectedVehicle.value ||
    !confirm(`¿Eliminar ${vehicleName(selectedVehicle.value)} y todo su historial?`)
  )
    return
  await api.delete(`/vehicles/${selectedVehicle.value.id}`)
  selectedId.value = null
  await loadVehicles()
}
const saveExpense = async () => {
  if (!selectedId.value) return
  try {
    if (editingExpenseId.value)
      await api.patch(
        `/vehicles/${selectedId.value}/expenses/${editingExpenseId.value}`,
        expenseForm.value
      )
    else {
      const { vehicle_id: _vehicleId, ...payload } = expenseForm.value
      await api.post(`/vehicles/${selectedId.value}/expenses`, payload)
    }
    showExpenseForm.value = false
    editingExpenseId.value = null
    await loadVehicles()
  } catch (error: any) {
    alert(error.response?.data?.detail || 'No se pudo guardar el gasto')
  }
}
const openCreateExpense = () => {
  editingExpenseId.value = null
  expenseForm.value = {
    category: 'Taller',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    mileage: null,
    workshop: '',
    notes: '',
    vehicle_id: selectedId.value,
  }
  showExpenseForm.value = true
}
const openEditExpense = (item: Expense) => {
  editingExpenseId.value = item.id
  expenseForm.value = {
    category: item.category,
    description: item.description,
    amount: item.amount,
    expense_date: item.expense_date,
    mileage: item.mileage,
    workshop: item.workshop || '',
    notes: '',
    vehicle_id: selectedId.value,
  }
  showExpenseForm.value = true
}
const saveMaintenance = async () => {
  if (!selectedId.value) return
  const payload = {
    ...maintenanceForm.value,
    completed_date: nullable(maintenanceForm.value.completed_date),
    next_date: nullable(maintenanceForm.value.next_date),
  }
  try {
    await api.post(`/vehicles/${selectedId.value}/maintenance`, payload)
    showMaintenanceForm.value = false
    await loadVehicles()
  } catch (error: any) {
    alert(error.response?.data?.detail || 'No se pudo guardar el mantenimiento')
  }
}
const removeExpense = async (item: Expense) => {
  if (selectedId.value && confirm(`¿Eliminar el gasto “${item.description}”?`)) {
    await api.delete(`/vehicles/${selectedId.value}/expenses/${item.id}`)
    await loadDashboard()
  }
}
const removeMaintenance = async (item: Maintenance) => {
  if (selectedId.value && confirm(`¿Eliminar “${item.title}”?`)) {
    await api.delete(`/vehicles/${selectedId.value}/maintenance/${item.id}`)
    await loadDashboard()
  }
}

onMounted(loadVehicles)
</script>

<template>
  <main class="vehicles-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">Movilidad</span>
        <h1>Vehículos</h1>
        <p>Controla el mantenimiento, los gastos y los próximos vencimientos de tu garaje.</p>
      </div>
      <button class="btn-primary" @click="openCreateVehicle">Añadir vehículo</button>
    </header>

    <section v-if="loadError" class="empty-garage card">
      <div class="empty-icon">!</div>
      <h2>No se pudo cargar el garaje</h2>
      <p>{{ loadError }}</p>
      <button class="btn-primary" @click="loadVehicles()">Reintentar</button>
    </section>
    <section v-else-if="loading && !vehicles.length" class="empty-garage card">
      <div class="empty-icon">···</div>
      <h2>Cargando vehículos</h2>
      <p>Estamos recuperando la información de tu garaje.</p>
    </section>
    <section v-else-if="!vehicles.length" class="empty-garage card">
      <div class="empty-icon">V</div>
      <h2>Tu garaje está vacío</h2>
      <p>
        Añade tu primer vehículo para centralizar sus revisiones, ITV, seguro e historial de costes.
      </p>
      <button class="btn-primary" @click="openCreateVehicle">Crear vehículo</button>
    </section>

    <template v-else>
      <div class="vehicle-switcher">
        <button
          v-for="vehicle in vehicles"
          :key="vehicle.id"
          :class="['vehicle-chip', { active: vehicle.id === selectedId }]"
          @click="selectVehicle(vehicle.id)"
        >
          <span>{{ vehicle.brand.slice(0, 1) }}{{ vehicle.model.slice(0, 1) }}</span
          ><strong>{{ vehicleName(vehicle) }}</strong
          ><small>{{ vehicle.license_plate }}</small>
        </button>
      </div>

      <section v-if="selectedVehicle" class="vehicle-hero card">
        <div class="vehicle-avatar">
          {{ selectedVehicle.brand.slice(0, 1) }}{{ selectedVehicle.model.slice(0, 1) }}
        </div>
        <div class="vehicle-title">
          <span class="eyebrow">{{ selectedVehicle.license_plate }}</span>
          <h2>{{ vehicleName(selectedVehicle) }}</h2>
          <p>
            {{ selectedVehicle.year || 'Año no indicado' }} ·
            {{ selectedVehicle.fuel_type || 'Combustible no indicado' }} ·
            {{ selectedVehicle.current_km.toLocaleString('es-ES') }} km
          </p>
        </div>
        <div class="hero-actions">
          <button class="btn-secondary" @click="openEditVehicle">Editar ficha</button
          ><button class="btn-text danger" @click="removeVehicle">Eliminar</button>
        </div>
      </section>

      <section v-if="dashboard" class="kpi-grid">
        <article class="card kpi">
          <span>Coste registrado</span><strong>{{ money(dashboard.total_cost) }}</strong
          ><small>Gastos y mantenimientos</small>
        </article>
        <article class="card kpi">
          <span>Kilometraje actual</span
          ><strong>{{ selectedVehicle?.current_km.toLocaleString('es-ES') }} km</strong
          ><small>Actualízalo al añadir registros</small>
        </article>
        <article class="card kpi">
          <span>Próximos avisos</span><strong>{{ dashboard.upcoming.length }}</strong
          ><small
            >{{ dashboard.upcoming.filter((item) => item.status === 'Vencido').length }} vencidos ·
            {{ dashboard.upcoming.filter((item) => item.status === 'Próximo').length }}
            próximos</small
          >
        </article>
      </section>

      <section v-if="dashboard" class="content-grid">
        <article class="card reminders-card">
          <div class="section-heading">
            <div>
              <h3>Próximos vencimientos</h3>
              <p>Seguro, ITV y mantenimiento preventivo.</p>
            </div>
            <button class="btn-secondary" @click="showMaintenanceForm = true">
              Planificar mantenimiento
            </button>
          </div>
          <div class="legal-reminders">
            <div>
              <span>ITV</span><strong>{{ date(selectedVehicle?.itv_expiry || null) }}</strong>
            </div>
            <div>
              <span>Seguro</span
              ><strong>{{ date(selectedVehicle?.insurance_expiry || null) }}</strong>
            </div>
          </div>
          <div v-if="dashboard.upcoming.length" class="reminder-list">
            <div v-for="item in dashboard.upcoming" :key="item.id" class="reminder-row">
              <span :class="['status-dot', item.status.toLowerCase()]"></span>
              <div>
                <strong>{{ item.title }}</strong
                ><small
                  >{{ item.next_date ? `Fecha: ${date(item.next_date)}` : ''
                  }}{{ item.next_date && item.next_km !== null ? ' · ' : ''
                  }}{{
                    item.next_km !== null ? `a los ${item.next_km.toLocaleString('es-ES')} km` : ''
                  }}</small
                >
              </div>
              <span :class="['status-label', item.status.toLowerCase()]">{{ item.status }}</span>
            </div>
          </div>
          <p v-else class="muted-empty">No hay mantenimientos planificados todavía.</p>
        </article>

        <article class="card details-card">
          <div class="section-heading">
            <div>
              <h3>Ficha del vehículo</h3>
              <p>Información técnica y administrativa.</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Matrícula</dt>
              <dd>{{ selectedVehicle?.license_plate }}</dd>
            </div>
            <div>
              <dt>VIN / bastidor</dt>
              <dd>{{ selectedVehicle?.vin || 'No indicado' }}</dd>
            </div>
            <div>
              <dt>Combustible</dt>
              <dd>{{ selectedVehicle?.fuel_type || 'No indicado' }}</dd>
            </div>
            <div>
              <dt>Notas</dt>
              <dd>{{ selectedVehicle?.notes || 'Sin notas' }}</dd>
            </div>
          </dl>
        </article>

        <article class="card history-card">
          <div class="section-heading">
            <div>
              <h3>Gastos de taller</h3>
              <p>Reparaciones, neumáticos, combustible y otros costes.</p>
            </div>
            <button class="btn-primary" @click="openCreateExpense">Registrar gasto</button>
          </div>
          <div v-if="dashboard.expenses.length" class="history-list">
            <div v-for="item in dashboard.expenses" :key="item.id" class="history-row">
              <div>
                <span class="category-tag">{{ item.category }}</span
                ><strong>{{ item.description }}</strong
                ><small
                  >{{ date(item.expense_date) }}{{ item.workshop ? ` · ${item.workshop}` : ''
                  }}{{ item.mileage ? ` · ${item.mileage.toLocaleString('es-ES')} km` : '' }}</small
                >
              </div>
              ><b>{{ money(item.amount) }}</b
              ><button class="btn-text" @click="openEditExpense(item)">Editar</button
              ><button class="btn-text danger" @click="removeExpense(item)">Eliminar</button>
            </div>
          </div>
          <p v-else class="muted-empty">Aún no hay gastos registrados.</p>
        </article>

        <article class="card history-card">
          <div class="section-heading">
            <div>
              <h3>Historial de mantenimiento</h3>
              <p>Cambios de aceite, revisiones, frenos y tareas planificadas.</p>
            </div>
            <button class="btn-primary" @click="showMaintenanceForm = true">
              Añadir mantenimiento
            </button>
          </div>
          <div v-if="dashboard.maintenance.length" class="history-list">
            <div v-for="item in dashboard.maintenance" :key="item.id" class="history-row">
              <div>
                <span class="category-tag">{{
                  item.completed_date ? 'Realizado' : 'Planificado'
                }}</span
                ><strong>{{ item.title }}</strong
                ><small
                  >{{
                    item.completed_date
                      ? `Hecho: ${date(item.completed_date)}`
                      : 'Sin fecha de ejecución'
                  }}{{ item.next_date ? ` · Próximo: ${date(item.next_date)}` : ''
                  }}{{ item.next_km ? ` · ${item.next_km.toLocaleString('es-ES')} km` : '' }}</small
                >
              </div>
              <b v-if="item.cost">{{ money(item.cost) }}</b
              ><button class="btn-text danger" @click="removeMaintenance(item)">Eliminar</button>
            </div>
          </div>
          <p v-else class="muted-empty">Añade tareas para no olvidar ningún mantenimiento.</p>
        </article>
      </section>
    </template>

    <div v-if="showVehicleForm" class="modal-backdrop" @click.self="showVehicleForm = false">
      <form class="modal" @submit.prevent="saveVehicle">
        <div class="modal-header">
          <div>
            <h3>{{ editingVehicle ? 'Editar vehículo' : 'Nuevo vehículo' }}</h3>
            <p>La ficha se mantiene separada para cada vehículo.</p>
          </div>
          <button type="button" class="btn-close" @click="showVehicleForm = false">×</button>
        </div>
        <div class="form-grid">
          <label
            >Marca<input
              v-model.trim="vehicleForm.brand"
              required
              placeholder="Ej. Toyota" /></label
          ><label
            >Modelo<input
              v-model.trim="vehicleForm.model"
              required
              placeholder="Ej. Land Cruiser" /></label
          ><label
            >Matrícula<input
              v-model.trim="vehicleForm.license_plate"
              required
              placeholder="0000 ABC" /></label
          ><label
            >Año<input
              v-model.number="vehicleForm.year"
              type="number"
              min="1900"
              max="2100" /></label
          ><label
            >Combustible<select v-model="vehicleForm.fuel_type">
              <option value="">No indicado</option>
              <option>Gasolina</option>
              <option>Diésel</option>
              <option>Híbrido</option>
              <option>Híbrido enchufable</option>
              <option>Eléctrico</option>
              <option>GLP</option>
            </select></label
          ><label
            >Kilometraje actual<input
              v-model.number="vehicleForm.current_km"
              type="number"
              min="0"
              required /></label
          ><label>VIN / bastidor<input v-model.trim="vehicleForm.vin" /></label
          ><label
            >Vencimiento seguro<input v-model="vehicleForm.insurance_expiry" type="date" /></label
          ><label>Vencimiento ITV<input v-model="vehicleForm.itv_expiry" type="date" /></label
          ><label class="full"
            >Notas<textarea
              v-model.trim="vehicleForm.notes"
              placeholder="Versión, color, observaciones o datos útiles..."
            ></textarea>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showVehicleForm = false">
            Cancelar</button
          ><button class="btn-primary">Guardar vehículo</button>
        </div>
      </form>
    </div>

    <div v-if="showExpenseForm" class="modal-backdrop" @click.self="showExpenseForm = false">
      <form class="modal compact" @submit.prevent="saveExpense">
        <div class="modal-header">
          <div>
            <h3>{{ editingExpenseId ? 'Editar gasto' : 'Registrar gasto' }}</h3>
            <p>Quedará asociado a {{ selectedVehicle ? vehicleName(selectedVehicle) : '' }}.</p>
          </div>
          <button type="button" class="btn-close" @click="showExpenseForm = false">×</button>
        </div>
        <div class="form-grid">
          <label v-if="editingExpenseId" class="full"
            >Vehículo<select v-model.number="expenseForm.vehicle_id">
              <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
                {{ vehicleName(vehicle) }} · {{ vehicle.license_plate }}
              </option>
            </select></label
          ><label
            >Categoría<select v-model="expenseForm.category">
              <option>Taller</option>
              <option>Repuestos</option>
              <option>Neumáticos</option>
              <option>Combustible</option>
              <option>Seguro</option>
              <option>ITV</option>
              <option>Otros</option>
            </select></label
          ><label>Fecha<input v-model="expenseForm.expense_date" type="date" required /></label
          ><label class="full"
            >Descripción<input
              v-model.trim="expenseForm.description"
              required
              placeholder="Ej. Cambio de neumáticos delanteros" /></label
          ><label
            >Importe (€)<input
              v-model.number="expenseForm.amount"
              type="number"
              min="0.01"
              step="0.01"
              required /></label
          ><label
            >Kilometraje<input v-model.number="expenseForm.mileage" type="number" min="0" /></label
          ><label class="full"
            >Taller / proveedor<input v-model.trim="expenseForm.workshop" placeholder="Opcional"
          /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showExpenseForm = false">
            Cancelar</button
          ><button class="btn-primary">
            {{ editingExpenseId ? 'Guardar cambios' : 'Guardar gasto' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="showMaintenanceForm"
      class="modal-backdrop"
      @click.self="showMaintenanceForm = false"
    >
      <form class="modal" @submit.prevent="saveMaintenance">
        <div class="modal-header">
          <div>
            <h3>Mantenimiento</h3>
            <p>Planifica por fecha, kilometraje o ambos.</p>
          </div>
          <button type="button" class="btn-close" @click="showMaintenanceForm = false">×</button>
        </div>
        <div class="form-grid">
          <label class="full"
            >Tarea<input
              v-model.trim="maintenanceForm.title"
              required
              placeholder="Ej. Cambio de aceite y filtros" /></label
          ><label
            >Fecha realizada<input v-model="maintenanceForm.completed_date" type="date" /></label
          ><label
            >Kilometraje realizado<input
              v-model.number="maintenanceForm.completed_km"
              type="number"
              min="0" /></label
          ><label>Próxima fecha<input v-model="maintenanceForm.next_date" type="date" /></label
          ><label
            >Próximo kilometraje<input
              v-model.number="maintenanceForm.next_km"
              type="number"
              min="0" /></label
          ><label
            >Coste (€)<input
              v-model.number="maintenanceForm.cost"
              type="number"
              min="0"
              step="0.01" /></label
          ><label>Taller<input v-model.trim="maintenanceForm.workshop" /></label
          ><label class="full"
            >Descripción<input
              v-model.trim="maintenanceForm.description"
              placeholder="Productos usados o detalles de la reparación"
          /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showMaintenanceForm = false">
            Cancelar</button
          ><button class="btn-primary">Guardar mantenimiento</button>
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.vehicles-page {
  min-height: 100%;
  padding: 28px 30px 36px;
}
.page-header,
.section-heading,
.vehicle-hero,
.history-row,
.reminder-row {
  display: flex;
  align-items: center;
}
.page-header {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.eyebrow {
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.page-header h1 {
  margin: 5px 0 6px;
  font-size: 1.7rem;
  letter-spacing: -0.04em;
}
.page-header p,
.section-heading p,
small,
.muted-empty {
  color: var(--text-muted);
}
.page-header p,
.section-heading p {
  margin: 0;
}
.empty-garage {
  max-width: 560px;
  margin: 72px auto;
  padding: 42px;
  text-align: center;
}
.empty-icon,
.vehicle-avatar {
  display: grid;
  place-items: center;
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 800;
}
.empty-icon {
  width: 50px;
  height: 50px;
  margin: 0 auto 16px;
  border-radius: 14px;
}
.empty-garage h2 {
  margin: 0 0 8px;
}
.empty-garage p {
  max-width: 390px;
  margin: 0 auto 20px;
  color: var(--text-muted);
  line-height: 1.55;
}
.vehicle-switcher {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 14px;
}
.vehicle-chip {
  min-width: 180px;
  display: grid;
  grid-template-columns: 30px 1fr;
  column-gap: 9px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 11px;
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
}
.vehicle-chip > span {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}
.vehicle-chip strong {
  font-size: 0.82rem;
}
.vehicle-chip small {
  font-size: 0.7rem;
}
.vehicle-chip.active {
  border-color: #a5b4fc;
  background: var(--primary-light);
}
.vehicle-chip.active > span {
  background: var(--primary);
  color: white;
}
.vehicle-hero {
  gap: 15px;
  padding: 19px 20px;
  margin-bottom: 14px;
}
.vehicle-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex: none;
}
.vehicle-title {
  flex: 1;
  min-width: 0;
}
.vehicle-title h2 {
  margin: 3px 0;
  font-size: 1.25rem;
}
.vehicle-title p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-secondary,
.btn-text {
  border: 0;
  border-radius: 9px;
  padding: 8px 11px;
  background: #eef2f7;
  color: var(--text-main);
  font-weight: 650;
  cursor: pointer;
}
.btn-text {
  background: transparent;
  color: var(--primary);
  padding: 5px;
}
.danger {
  color: var(--danger);
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}
.kpi {
  padding: 16px;
}
.kpi span {
  display: block;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 650;
}
.kpi strong {
  display: block;
  margin: 7px 0 4px;
  font-size: 1.45rem;
  letter-spacing: -0.035em;
}
.kpi small {
  font-size: 0.72rem;
}
.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.content-grid > .card {
  min-width: 0;
}
.section-heading {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.section-heading h3 {
  margin: 0 0 4px;
  font-size: 0.96rem;
}
.section-heading p {
  font-size: 0.78rem;
}
.legal-reminders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.legal-reminders div {
  padding: 9px 11px;
}
.legal-reminders div + div {
  border-left: 1px solid var(--border-color);
}
.legal-reminders span {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
}
.legal-reminders strong {
  display: block;
  margin-top: 3px;
  font-size: 0.84rem;
}
.reminder-list,
.history-list {
  border-top: 1px solid var(--border-color);
}
.reminder-row {
  gap: 9px;
  padding: 9px 1px;
  border-bottom: 1px solid #eef2f7;
}
.reminder-row div {
  flex: 1;
}
.reminder-row strong,
.reminder-row small {
  display: block;
}
.reminder-row strong {
  font-size: 0.84rem;
}
.reminder-row small {
  margin-top: 2px;
  font-size: 0.72rem;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: #94a3b8;
}
.status-dot.vencido {
  background: #dc2626;
}
.status-dot.próximo {
  background: #d97706;
}
.status-dot.planificado {
  background: #4f46e5;
}
.status-label {
  padding: 3px 7px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 0.67rem;
  font-weight: 700;
}
.status-label.vencido {
  background: #fee2e2;
  color: #b91c1c;
}
.status-label.próximo {
  background: #fff7e6;
  color: #a16207;
}
.details-card dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
}
.details-card dt {
  color: var(--text-muted);
  font-size: 0.72rem;
}
.details-card dd {
  margin: 3px 0 0;
  font-size: 0.84rem;
  font-weight: 650;
}
.history-card {
  min-height: 220px;
}
.history-row {
  gap: 10px;
  padding: 10px 1px;
  border-bottom: 1px solid #eef2f7;
}
.history-row > div {
  flex: 1;
  min-width: 0;
}
.history-row strong,
.history-row small {
  display: block;
}
.history-row strong {
  margin: 4px 0 2px;
  font-size: 0.84rem;
}
.history-row small {
  font-size: 0.72rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-row b {
  font-size: 0.84rem;
}
.category-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: 700;
}
.muted-empty {
  padding: 18px 0 4px;
  font-size: 0.82rem;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.46);
}
.modal {
  width: min(100%, 680px);
  padding: 22px;
  border-radius: 14px;
  background: var(--bg-card);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.26);
}
.modal.compact {
  width: min(100%, 560px);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.modal-header h3,
.modal-header p {
  margin: 0;
}
.modal-header p {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 0.8rem;
}
.btn-close {
  border: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-main);
  font-size: 0.78rem;
  font-weight: 700;
}
.form-grid .full {
  grid-column: 1 / -1;
}
.form-grid input,
.form-grid select,
.form-grid textarea {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: white;
  color: var(--text-main);
  outline: none;
}
.form-grid textarea {
  min-height: 74px;
  resize: vertical;
}
.form-grid input:focus,
.form-grid select:focus,
.form-grid textarea:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 18px;
}
@media (max-width: 900px) {
  .kpi-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .vehicles-page {
    padding: 20px 16px;
  }
  .page-header,
  .vehicle-hero {
    align-items: flex-start;
    flex-direction: column;
  }
  .hero-actions {
    width: 100%;
  }
  .form-grid,
  .details-card dl {
    grid-template-columns: 1fr;
  }
  .form-grid .full {
    grid-column: auto;
  }
}
</style>

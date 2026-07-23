<script setup lang="ts">
// Lógica opcional
</script>

<template>
  <div class="card">
    <div class="card">
      <h3>📌 Gastos Fijos y Compromisos Financieros</h3>
      <p class="subtitle-sm">Control de préstamos domiciliados y suscripciones regulares.</p>
      <div class="table-container" style="margin-top: 15px;">
        <table class="clean-table">
          <thead>
          <tr>
            <th>Estado</th>
            <th>Concepto</th>
            <th>Importe</th>
            <th>Descripción / Finalización</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td><span class="badge-status status-paid">Pagado</span></td>
            <td><strong>CREDITO Revolut</strong></td>
            <td>402,70 €</td>
            <td>Domiciliado en Revolut el día 5 (FIN Octubre 2032)</td>
          </tr>
          <tr>
            <td><span class="badge-status status-paid">Pagado</span></td>
            <td><strong>CREDITO Papa</strong></td>
            <td>400,00 €</td>
            <td>Cuota 1/125 (50.000€ prestados, FIN Noviembre 2036)</td>
          </tr>
          <tr>
            <td><span class="badge-status status-paid">Pagado</span></td>
            <td><strong>CREDITO Sabadell</strong></td>
            <td>220,00 €</td>
            <td>Sabadell a final de mes (FIN Octubre 2032)</td>
          </tr>
          <tr>
            <td><span class="badge-status status-paid">Pagado</span></td>
            <td><strong>CREDITO BBVA</strong></td>
            <td>105,00 €</td>
            <td>Domiciliado a final de mes (FIN Febrero 2035)</td>
          </tr>
          <tr>
            <td><span class="badge-status status-paid">Pagado</span></td>
            <td><strong>Starlink + VPN</strong></td>
            <td>50,00 €</td>
            <td>Conexión a internet</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.subtitle-sm {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.badge-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-paid { background: #dcfce7; color: #15803d; }
.status-waiting { background: #fef3c7; color: #b45309; }

.table-container {
  max-height: 350px;
  overflow-y: auto;
}

.clean-table {
  width: 100%;
  border-collapse: collapse;
}

.clean-table th {
  text-align: left;
  padding: 10px 12px;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border-color);
}

.clean-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}
</style>
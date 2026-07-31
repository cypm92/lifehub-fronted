<template>
  <div class="placeholder-page">
    <span class="eyebrow">Planificación</span>
    <h1>Calendario y avisos</h1>
    <p>Próximamente: recordatorios de pagos, eventos importantes y fechas límite.</p>
  </div>
</template>

<style scoped>
.placeholder-page {
  margin: 32px;
  padding: 28px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.eyebrow {
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 {
  margin: 8px 0;
  font-size: 1.55rem;
  letter-spacing: -0.03em;
}
p {
  margin: 0;
  color: var(--text-muted);
}
</style>

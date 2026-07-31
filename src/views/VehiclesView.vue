<template>
  <div class="placeholder-page">
    <span class="eyebrow">Movilidad</span>
    <h1>Gestor de vehículos</h1>
    <p>
      Próximamente: Historial de mantenimientos, ITV, seguros y gastos de combustible para tus 2
      coches.
    </p>
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

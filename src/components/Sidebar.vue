<template>
  <aside class="sidebar">
    <div class="logo">
      <h2>🌐 LifeHub</h2>
    </div>
    <nav class="nav-links">
      <RouterLink to="/finances" class="nav-item">
        <span>💰</span> Finanzas
      </RouterLink>
      <RouterLink to="/vehicles" class="nav-item">
        <span>🚗</span> Vehículos
      </RouterLink>
      <RouterLink to="/calendar" class="nav-item">
        <span>📅</span> Calendario
      </RouterLink>
      <RouterLink to="/vault" class="nav-item">
        <span>🔐</span> Bóveda
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  background-color: #1a1f2c;
  color: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  box-sizing: border-box;
}

.logo {
  padding: 0 20px;
  margin-bottom: 30px;
}

.logo h2 {
  margin: 0;
  color: #4fe1a5;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #a0aec0;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: #2d3748;
  color: white;
}

.router-link-active {
  background-color: #2b6cb0;
  color: white;
  border-left: 4px solid #4fe1a5;
  font-weight: bold;
}
</style>
<script setup>
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <div class="layout">
    <Sidebar />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* Estilos globales para quitar márgenes por defecto */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f4f6f8;
}

.layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}
</style>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
</script>

<template>
  <div class="layout">
    <!-- Solo muestra el Sidebar si no estamos en la vista de Login -->
    <Sidebar v-if="route.name !== 'Login'" />
    <main
      :class="{ 'main-content': route.name !== 'Login', 'full-content': route.name === 'Login' }"
    >
      <RouterView />
    </main>
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  overflow: hidden;
}

body {
  margin: 0;
  background: var(--bg-app);
}

.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.main-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  scrollbar-color: #cbd5e1 transparent;
  scrollbar-width: thin;
}
.full-content {
  flex: 1;
  width: 100%;
}
</style>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
</script>

<template>
  <div class="layout">
    <!-- Solo muestra el Sidebar si no estamos en la vista de Login -->
    <Sidebar v-if="route.name !== 'Login'" />
    <main :class="{ 'main-content': route.name !== 'Login', 'full-content': route.name === 'Login' }">
      <RouterView />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f4f6f8;
}

.layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; padding: 30px; overflow-y: auto; }
.full-content { flex: 1; width: 100%; }
</style>
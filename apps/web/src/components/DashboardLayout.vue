<!-- src/components/DashboardLayout.vue -->
<template>
  <div class="dashboard-layout">
    <header class="dashboard-header">
      <h1>{{ name }}</h1>
      <slot name="actions"></slot>
    </header>
    <main class="dashboard-content">
      <slot></slot>
    </main>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: {
    type: String,
    default: 'Dashboard',
  },
});
</script>

<style scoped>
.dashboard-layout {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.dashboard-header h1 {
  margin: 0;
  color: var(--color-primary-dark);
}

.dashboard-content {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 6px 16px var(--color-shadow);
  border: 1px solid var(--color-border);
}
</style>
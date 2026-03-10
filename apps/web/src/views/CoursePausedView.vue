<template>
  <div class="page">
    <div class="container">
      <div class="card card--padded paused-card">
        <h1>Kurz byl pozastaven</h1>
        <p class="message">Lektor tento kurz pozastavil. Zkuste to později nebo kontaktujte lektora.</p>
        <router-link to="/courses" class="btn btn-primary">← Zpět na kurzy</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.paused-card {
  max-width: 480px;
  margin: 60px auto;
  text-align: center;
}
.paused-card h1 {
  margin: 0 0 16px;
  color: var(--color-primary-dark);
}
.message {
  color: var(--color-text-muted);
  margin: 0 0 24px;
}
.btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
}
.btn-primary {
  background: var(--color-primary);
  color: white;
}
.btn-primary:hover {
  background: var(--color-primary-dark);
}
</style>

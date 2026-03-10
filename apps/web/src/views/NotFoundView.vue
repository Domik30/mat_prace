<template>
  <div class="page">
    <div class="container">
      <div class="card card--padded not-found-box">
        <h1>404</h1>
        <p class="lead">Stránka nenalezena</p>
        <p class="muted">Požadovaná adresa neexistuje nebo byla přesunuta.</p>
        <router-link to="/" class="btn btn-primary">Zpět na úvod</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-box {
  text-align: center;
  max-width: 480px;
  margin: 40px auto;
}
h1 {
  margin: 0 0 12px;
  font-size: 4rem;
  color: var(--color-primary-dark);
}
.lead {
  margin: 0 0 8px;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text);
}
.muted {
  margin: 0 0 20px;
}
</style>

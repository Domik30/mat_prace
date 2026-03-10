<template>
  <div class="page">
    <div class="container">
      <div class="card card--padded">
        <p class="badge">✉️ Kontakt</p>
        <h1>Napište nám</h1>
        <p class="muted">
          Otázky ke kurzům, přístupu nebo spolupráci jako lektor? Napište nám a brzy odpovíme.
        </p>

        <div class="cards">
          <div class="mini card card--padded">
            <h3>E-mail</h3>
            <a class="email" href="mailto:hello@thinkdifferent.academy">hello@thinkdifferent.academy</a>
            <p class="muted small">Podpora: Po–Pá (placeholder)</p>
          </div>
          <div class="mini card card--padded">
            <h3>Pro lektory</h3>
            <p class="muted">Chcete publikovat kurz? Pomůžeme vám vše nastavit od A do Z.</p>
            <router-link to="/login" class="btn btn-secondary">Přihlášení lektora</router-link>
          </div>
        </div>

        <div class="cta">
          <router-link to="/courses" class="btn btn-primary">Prohlédnout kurzy</router-link>
          <router-link to="/" class="btn btn-ghost">Zpět na úvod</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  margin: 14px 0 6px;
  color: var(--color-primary-dark);
}

.cards {
  margin: 18px 0 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.mini h3 {
  margin: 0 0 8px;
  color: var(--color-text);
}

.email {
  font-weight: 800;
  color: var(--color-primary-dark);
  text-decoration: none;
}

.email:hover {
  text-decoration: underline;
}

.small {
  font-size: 0.95rem;
  margin: 8px 0 0;
}

.cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 820px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>

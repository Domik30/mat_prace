<template>
  <div class="page">
    <div class="container">
      <div class="card card--padded">
        <p class="badge">📄 Právní informace</p>
        <h1>Impressum</h1>
        <p class="muted">
          Placeholder pro impressum. Nahraďte oficiálními právními údaji organizace (provozovatel, adresa, IČO atd.).
        </p>

        <div class="grid">
          <div class="item">
            <h3>Provozovatel</h3>
            <p class="muted">Think different Academy (placeholder)</p>
          </div>
          <div class="item">
            <h3>Adresa</h3>
            <p class="muted">Ulice 1, 000 00 Město (placeholder)</p>
          </div>
          <div class="item">
            <h3>Kontakt</h3>
            <p class="muted">
              <a class="mail" href="mailto:hello@thinkdifferent.academy">hello@thinkdifferent.academy</a>
              (placeholder)
            </p>
          </div>
        </div>

        <router-link to="/" class="btn btn-ghost">← Zpět na úvod</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  margin: 14px 0 6px;
  color: var(--color-primary-dark);
}

.grid {
  margin: 18px 0 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.item h3 {
  margin: 0 0 6px;
  color: var(--color-text);
}

.item p {
  margin: 0;
}

.mail {
  color: var(--color-primary-dark);
  font-weight: 800;
  text-decoration: none;
}

.mail:hover {
  text-decoration: underline;
}

@media (max-width: 820px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

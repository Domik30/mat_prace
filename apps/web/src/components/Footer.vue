<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="brand">
          <img :src="logoUrl" alt="Think different Academy" class="logo" />
          <p class="muted tagline">
            Moderní vzdělávací platforma pro studenty i lektory. Méně „čtení pro čtení“, více interakce a výsledků.
          </p>
        </div>

        <div class="col">
          <p class="title">Prozkoumat</p>
          <router-link to="/" class="link">Domů</router-link>
          <router-link to="/courses" class="link">Kurzy</router-link>
          <router-link to="/login" class="link">Přihlášení lektora</router-link>
        </div>

        <div class="col">
          <p class="title">Kontakt</p>
          <a class="link" href="mailto:hello@thinkdifferent.academy">hello@thinkdifferent.academy</a>
          <span class="muted small">Odpověď: 1–2 pracovní dny (placeholder)</span>
        </div>

        <div class="col">
          <p class="title">Právní informace</p>
          <router-link to="/imprint" class="link">Impressum</router-link>
          <router-link to="/terms" class="link">Obchodní podmínky</router-link>
          <router-link to="/privacy" class="link">Ochrana osobních údajů</router-link>
          <router-link to="/contact" class="link">Kontakt</router-link>
        </div>
      </div>

      <div class="footer-bottom">
        <span class="muted small">© {{ year }} Think different Academy. Všechna práva vyhrazena.</span>
        <span class="muted small">Vytvořeno pro studenty.</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import logoUrl from '../assets/Think-different-Academy_LOGO_oficialni_bile_1.svg';

const year = new Date().getFullYear();
</script>

<style scoped>
.footer {
  margin-top: 40px;
  padding: 40px 0 28px;
  background: linear-gradient(90deg, rgba(2, 87, 165, 0.96), rgba(0, 112, 187, 0.96));
  color: #fff;
  box-shadow: 0 -10px 24px rgba(2, 87, 165, 0.12);
}

.footer :deep(.muted) {
  color: rgba(255, 255, 255, 0.76);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 26px;
  align-items: start;
}

.brand .logo {
  height: 38px;
  width: auto;
  display: block;
  margin-bottom: 10px;
}

.tagline {
  margin: 0;
  max-width: 44ch;
  line-height: 1.55;
}

.title {
  margin: 0 0 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.link {
  display: inline-flex;
  padding: 6px 0;
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  opacity: 0.92;
}

.link:hover {
  opacity: 1;
  text-decoration: underline;
}

.small {
  font-size: 0.95rem;
}

.col {
  display: flex;
  flex-direction: column;
}

.footer-bottom {
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>


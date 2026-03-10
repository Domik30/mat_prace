<!-- src/views/HomeView.vue -->
<template>
  <div class="home page">
    <div class="container">
      <section class="hero card">
        <div class="hero-inner">
          <div class="hero-copy">
            <p class="badge">🎓 Pro studenty</p>
            <h1>Učte se chytře, ne usilovně.</h1>
            <p class="lead">
              Think different Academy přináší moderní, interaktivní učení — navržené tak, abyste byli v pohybu, soustředění
              a sebevědomí ohledně skutečných výsledků.
            </p>

            <div class="benefits">
              <p><strong>🚀 Rychlý pokrok:</strong> krátké lekce, jasné cíle, méně „scrollování teorií“.</p>
              <p><strong>🧠 Hlubší přemýšlení:</strong> kvízy a materiály, které upevňují porozumění.</p>
              <p><strong>🧭 Vždy orientovaní:</strong> budete vědět, co dělat dál a proč na tom záleží.</p>
            </div>

            <div class="hero-cta">
              <router-link to="/courses" class="btn btn-accent">Prohlédnout kurzy</router-link>
              <a href="#how" class="btn btn-secondary">Jak to funguje</a>
            </div>

            <div class="trust">
              <span class="trust-item">⭐ 4,8/5 spokojenost (placeholder)</span>
              <span class="trust-item">⏱️ Prům. lekce: 10–15 min (placeholder)</span>
              <span class="trust-item">📈 92 % dokončení (placeholder)</span>
            </div>
          </div>

          <div class="hero-visual">
            <img :src="logoUrl" alt="Think different Academy logo" class="hero-logo" />
            <div class="visual-card card card--padded">
              <p class="muted small">Váš další krok</p>
              <p class="visual-title">Vyberte kurz → otevřete materiály → vyplňte kvíz</p>
              <p class="muted small">Jednoduchý, konzistentní průběh. Žádné slepé uličky.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="how">
        <div class="section-head">
          <h2>Co získáte</h2>
          <p class="muted">Platforma, která žije: jasné výzvy k akci, kvalitní vizuály a skutečné signály důvěry.</p>
        </div>

        <div class="stats">
          <div class="card card--padded">
            <p class="stat-num">48+</p>
            <p class="muted">dostupných kurzů (placeholder)</p>
          </div>
          <div class="card card--padded">
            <p class="stat-num">1 200+</p>
            <p class="muted">studujících studentů (placeholder)</p>
          </div>
          <div class="card card--padded">
            <p class="stat-num">3×</p>
            <p class="muted">rychlejší onboarding (placeholder)</p>
          </div>
        </div>
      </section>

      <section class="section about card card--padded">
        <div class="about-grid">
          <div>
            <p class="badge">✨ Poslání</p>
            <h2>Think different Academy</h2>
            <p class="muted">
              Think different Academy je nezisková organizace zaměřená na rozvoj kritického a kreativního myšlení
              studentů i široké veřejnosti.
            </p>
            <p class="muted">
              Vyvíjíme vzdělávací platformu, která ukazuje, že učení může probíhat moderně a interaktivně — bez úmorného
              pročítání textů.
            </p>
            <p class="muted">
              Současně chceme usnadnit práci lektorům: publikování materiálů, správa kurzu a jednoduché testování
              přímo v jedné aplikaci.
            </p>
          </div>

          <div class="about-cards">
            <div class="mini card card--padded">
              <p class="mini-title">📚 Materiály</p>
              <p class="muted">Soubory a odkazy na jednom místě, snadno k opětovnému prohlédnutí.</p>
            </div>
            <div class="mini card card--padded">
              <p class="mini-title">✅ Kvízy</p>
              <p class="muted">Rychlé testy, které proměňují učení v měřitelný pokrok.</p>
            </div>
            <div class="mini card card--padded">
              <p class="mini-title">📣 Oznámení</p>
              <p class="muted">Buďte v obraze bez ztráty důležitých informací.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Fakta, ne sliby</h2>
          <p class="muted">Placeholder níže — nahraďte skutečnými příběhy a čísly.</p>
        </div>

        <div class="testimonials">
          <div class="card card--padded">
            <p class="quote">“Finally a course flow that doesn’t feel like a PDF dump.”</p>
            <p class="muted">— Student, 2nd year (placeholder)</p>
          </div>
          <div class="card card--padded">
            <p class="quote">“Kvízy mi ukázaly, co opravdu chápu what I actually understood.”</p>
            <p class="muted">— Student (placeholder)</p>
          </div>
          <div class="card card--padded">
            <p class="quote">“Publikace materiálů byla rychlá, a studenti zůstali zapojení.”</p>
            <p class="muted">— Lektor (placeholder)</p>
          </div>
        </div>
      </section>

      <section class="section lecturer card card--padded">
        <div class="lecturer-grid">
          <div>
            <p class="badge">🧑‍🏫 Pro lektory</p>
            <h2>Učte online s menším třením</h2>
            <p class="muted">
              Vytvářejte kurzy, přikládejte materiály a hodnotte učení pomocí lehkých kvízů — bez boje
              s těžkopádnými nástroji.
            </p>
            <div class="hero-cta">
              <router-link to="/login" class="btn btn-primary">Přihlášení lektora</router-link>
              <router-link to="/contact" class="btn btn-ghost">Spolupracujte s námi</router-link>
            </div>
          </div>
          <div class="lecturer-points">
            <div class="point card card--padded">
              <p class="mini-title">🧩 Struktura</p>
              <p class="muted">Konzistentní rozvržení kurzu a zkušenost studentů.</p>
            </div>
            <div class="point card card--padded">
              <p class="mini-title">⚡ Rychlost</p>
              <p class="muted">Vytvářejte a aktualizujte materiály rychle.</p>
            </div>
            <div class="point card card--padded">
              <p class="mini-title">📊 Přehled</p>
              <p class="muted">Sledujte pokusy a posilujte slabá místa.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="final-cta">
        <div class="card card--padded">
          <h2>Připraveni začít?</h2>
          <p class="muted">Prohlédněte kurzy a vyzkoušejte kvíz během minut.</p>
          <router-link to="/courses" class="btn btn-accent">Prozkoumat katalog</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import logoUrl from '../assets/Think-different-Academy_LOGO_oficialni_1.svg';
</script>

<style scoped>
.home {
  color: var(--color-text);
}

.hero {
  padding: 26px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border-color: rgba(37, 146, 184, 0.26);
  background:
    radial-gradient(700px 320px at 0% 0%, rgba(145, 245, 173, 0.28), transparent 60%),
    radial-gradient(700px 320px at 100% 0%, rgba(0, 112, 187, 0.14), transparent 55%),
    var(--color-surface);
}

.hero-inner {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 26px;
  align-items: center;
}

h1 {
  margin: 12px 0 10px;
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  line-height: 1.05;
  color: var(--color-primary-dark);
}

.lead {
  margin: 0 0 14px;
  font-size: 1.15rem;
  color: var(--color-text-muted);
  max-width: 60ch;
}

.benefits {
  display: grid;
  gap: 8px;
  margin: 14px 0 18px;
}

.benefits p {
  margin: 0;
  color: var(--color-text);
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.trust {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.trust-item {
  font-weight: 800;
  color: rgba(26, 26, 26, 0.72);
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(37, 146, 184, 0.22);
  padding: 8px 10px;
  border-radius: 999px;
}

.hero-visual {
  display: grid;
  justify-items: end;
  gap: 14px;
}

.hero-logo {
  height: 70px;
  width: auto;
  filter: drop-shadow(0 10px 14px rgba(2, 87, 165, 0.12));
}

.visual-card {
  width: min(380px, 100%);
}

.visual-title {
  margin: 4px 0 6px;
  font-weight: 900;
  color: var(--color-text);
}

.small {
  font-size: 0.95rem;
  margin: 0;
}

.section {
  margin-top: 28px;
  padding: 12px 0;
}

.section-head h2 {
  margin: 0;
  color: var(--color-primary-dark);
}

.section-head p {
  margin: 6px 0 0;
}

.stats {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-num {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--color-primary-dark);
}

.about {
  background: var(--color-surface-muted);
  padding: 28px 26px !important;
}

.about-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 18px;
  align-items: start;
}

.about-cards {
  display: grid;
  gap: 12px;
}

.mini-title {
  margin: 0 0 6px;
  font-weight: 900;
  color: var(--color-text);
}

.testimonials {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.quote {
  margin: 0 0 10px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.4;
}

.lecturer {
  background:
    radial-gradient(700px 320px at 100% 0%, rgba(145, 245, 173, 0.22), transparent 62%),
    var(--color-surface);
  padding: 28px 26px !important;
}

.lecturer-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 18px;
  align-items: start;
}

.lecturer-points {
  display: grid;
  gap: 12px;
}

.final-cta {
  margin-top: 28px;
  padding-bottom: 20px;
}

.final-cta h2 {
  margin: 0 0 6px;
  color: var(--color-primary-dark);
}

@media (max-width: 980px) {
  .hero-inner,
  .about-grid,
  .lecturer-grid {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    justify-items: start;
  }
  .stats,
  .testimonials {
    grid-template-columns: 1fr;
  }
}
</style>
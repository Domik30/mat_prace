<!-- src/components/Navbar.vue -->
<template>
  <nav class="navbar">
    <div class="nav-brand">
      <router-link to="/">
        <img :src="logoUrl" alt="Think different Academy" class="brand-logo" />
      </router-link>
    </div>

    <div class="nav-links">
      <router-link to="/">Domů</router-link>
      <router-link to="/courses">Kurzy</router-link>
      <router-link v-if="authStore.isLoggedIn && authStore.canAccessDashboard" to="/dashboard">
        Dashboard
      </router-link>
    </div>

    <div class="nav-auth">
      <router-link v-if="!authStore.isLoggedIn" to="/login" class="login-btn">Přihlásit</router-link>
      <button v-else @click="handleLogout">Odhlásit</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import logoUrl from '../assets/Think-different-Academy_LOGO_oficialni_bile_1.svg';

const authStore = useAuthStore();
const router = useRouter();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 18px 32px;
  background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary));
  color: #fff;
  box-shadow: 0 6px 16px var(--color-shadow);
  gap: 20px;
}

.nav-brand {
  justify-self: start;
}

.nav-brand a {
  display: inline-flex;
  align-items: center;
  color: #fff;
  text-decoration: none;
}
.brand-logo {
  height: 36px;
  width: auto;
  display: block;
}

.nav-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  justify-self: center;
}

.nav-links a {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 6px;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-links a:hover {
  background: rgba(145, 245, 173, 0.18);
  color: #fff;
}

.login-btn {
  background: var(--color-accent-strong);
  color: var(--color-text);
  font-weight: 700;
  padding: 12px 22px !important;
  border-radius: 8px;
}

.login-btn:hover {
  background: var(--color-accent);
  color: var(--color-text);
}

.nav-auth {
  justify-self: end;
  display: flex;
  align-items: center;
}

.nav-auth a,
.nav-auth button {
  background: var(--color-teal-strong);
  color: #fff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
  text-decoration: none;
}

.nav-auth a:hover,
.nav-auth button:hover {
  background: var(--color-primary-dark);
}

@media (max-width: 768px) {
  .navbar {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .nav-brand {
    justify-self: center;
  }

  .nav-links {
    margin: 10px 0;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-auth {
    justify-self: center;
  }
}
</style>
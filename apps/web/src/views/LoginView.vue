<!-- src/views/LoginView.vue -->
<template>
  <div class="login-page">
    <div class="login-box">
      <h2>Přihlášení</h2>
      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>Uživatelské jméno</label>
          <input v-model="username" type="text" required autocomplete="username" />
        </div>
        <div class="field">
          <label>Heslo</label>
          <input v-model="password" type="password" required autocomplete="current-password" />
        </div>
        <button type="submit" :disabled="loading">Přihlásit</button>
      </form>
      <p class="register-link">
        Nemáte účet? <router-link to="/register">Registrace</router-link>
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api } from '../services/api';

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

async function handleLogin() {
  error.value = '';
  loading.value = true;

  try {
    const data = await api<{ token: string; role?: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });

    authStore.login(data.token, data.role);
    router.push(authStore.canAccessDashboard ? '/dashboard' : '/');
  } catch (err: any) {
    error.value = 'Neplatné uživatelské jméno nebo heslo';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 40px 20px;
  display: flex;
  justify-content: center;
}

.login-box {
  width: min(1100px, 100%);
  margin: 0 auto;
  background: white;
  padding: 40px 28px;
  border-radius: 12px;
  box-shadow: 0 8px 20px var(--color-shadow);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.login-box h2 {
  margin-top: 0;
  margin-bottom: 24px;
  text-align: center;
  color: var(--color-primary-dark);
}

.login-box form {
  max-width: 440px;
  margin: 0 auto;
}

.field {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: var(--color-text);
}

input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  color: var(--color-text);
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 112, 187, 0.14);
}

button {
  width: 100%;
  padding: 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  font-weight: 700;
}

button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 16px;
  color: var(--color-text-muted);
}

.register-link a {
  font-weight: 700;
}

.error {
  color: var(--color-primary-dark);
  margin-top: 15px;
  text-align: center;
}
</style>
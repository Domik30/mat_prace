<template>
  <div class="login-page">
    <div class="login-box">
      <h2>Registrace</h2>
      <form @submit.prevent="handleRegister">
        <div class="field">
          <label>Uživatelské jméno</label>
          <input v-model="username" type="text" required autocomplete="username" minlength="2" />
        </div>
        <div class="field">
          <label>Heslo</label>
          <input v-model="password" type="password" required autocomplete="new-password" minlength="6" />
        </div>
        <button type="submit" :disabled="loading">Vytvořit účet</button>
      </form>
      <p class="login-link">
        Už máte účet? <router-link to="/login">Přihlásit</router-link>
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();

async function handleRegister() {
  error.value = '';
  loading.value = true;

  try {
    await api('/login/register', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
      }),
    });
    router.push('/login');
  } catch (err: any) {
    let msg = err?.message ?? '';
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error) msg = parsed.error;
    } catch {
      // use raw message
    }
    if (msg.includes('already taken') || msg.includes('Username already taken')) {
      error.value = 'Uživatelské jméno je již obsazeno.';
    } else if (msg.includes('at least 2')) {
      error.value = 'Uživatelské jméno musí mít alespoň 2 znaky.';
    } else if (msg.includes('at least 6')) {
      error.value = 'Heslo musí mít alespoň 6 znaků.';
    } else {
      error.value = 'Registrace se nezdařila. Zkuste to znovu.';
    }
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

.login-link {
  text-align: center;
  margin-top: 16px;
  color: var(--color-text-muted);
}

.login-link a {
  font-weight: 700;
}

.error {
  color: var(--color-primary-dark);
  margin-top: 15px;
  text-align: center;
}
</style>

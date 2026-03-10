<template>
  <form class="login-form" @submit.prevent="$emit('submit', credentials)">
    <div class="form-group">
      <label for="username">Username</label>
      <input
          id="username"
          v-model="credentials.username"
          type="text"
          required
          autocomplete="username"
          placeholder="Enter username"
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
          id="password"
          v-model="credentials.password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="Enter password"
      />
    </div>

    <button type="submit" :disabled="disabled">
      <span v-if="loading">Logging in...</span>
      <span v-else>Login</span>
    </button>

    <p v-if="error" class="error-message">{{ error }}</p>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

// Use defineProps without assigning to a const to avoid "props never used" warnings
defineProps({
  loading: Boolean,
  error: String,
  disabled: Boolean,
});

const credentials = reactive({
  username: '',
  password: '',
});

defineEmits(['submit']);
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

button {
  width: 100%;
  padding: 14px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #764ba2;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  margin-top: 15px;
  text-align: center;
}
</style>
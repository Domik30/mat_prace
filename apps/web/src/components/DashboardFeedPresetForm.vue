<template>
  <div class="feed-form-overlay" role="dialog" aria-modal="true">
    <div class="panel feed-form">
      <header class="panel-head">
        <div>
          <h3>{{ mode === 'edit' ? 'Upravit předvolbu oznámení' : 'Přidat předvolbu oznámení' }}</h3>
          <p class="subtext">Vytvořte šablonu pro rychlé přidávání oznámení do kurzů.</p>
        </div>
        <button class="btn-ghost" type="button" @click="$emit('cancel')">Zavřít</button>
      </header>

      <div class="panel-body">
        <div class="field">
          <label>Název předvolby</label>
          <input v-model="presetName" required placeholder="Např. Vítací zpráva" />
        </div>
        <div class="field">
          <label>Zpráva</label>
          <textarea v-model="message" rows="5" placeholder="Text oznámení…" required></textarea>
        </div>
        <div class="form-actions form-actions--end">
          <button class="btn-save" type="button" @click="savePreset">{{ mode === 'edit' ? 'Uložit' : 'Vytvořit' }}</button>
          <button class="btn-cancel" type="button" @click="$emit('cancel')">Zrušit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api } from '../services/api';

const props = defineProps<{
  mode: 'create' | 'edit';
  initial?: {
    uuid?: string;
    name?: string;
    message?: string;
  } | null;
}>();

const emit = defineEmits<{
  (event: 'saved'): void;
  (event: 'cancel'): void;
}>();

const presetName = ref('');
const message = ref('');

watch(
    () => props.initial,
    (value) => {
      if (value) {
        presetName.value = value.name ?? '';
        message.value = value.message ?? '';
      } else {
        presetName.value = '';
        message.value = '';
      }
    },
    { immediate: true }
);

async function savePreset() {
  if (!presetName.value || !message.value) {
    alert('Název předvolby a zpráva jsou povinné.');
    return;
  }
  try {
    const payload = {
      name: presetName.value,
      message: message.value,
    };

    const url = props.mode === 'edit' && props.initial?.uuid
        ? `/dashboard/presets/feeds/${props.initial.uuid}`
        : `/dashboard/presets/feeds`;

    await api(url, {
      method: props.mode === 'edit' ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    emit('saved');
  } catch (err) {
    alert('Nepodařilo se uložit předvolbu.');
  }
}
</script>

<style scoped>
.feed-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}

.feed-form {
  width: min(600px, 100%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 18px 50px var(--color-shadow);
  padding: 20px 24px 24px;
  border: 1px solid var(--color-border);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.panel-head h3 {
  margin: 0;
  font-size: 1.35rem;
  color: var(--color-primary-dark);
}

.subtext {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-weight: 600;
  color: var(--color-text);
}

input, textarea {
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.98rem;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-save {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
}

.btn-save:hover {
  background: var(--color-primary-dark);
}

.btn-cancel {
  background: transparent;
  color: var(--color-primary-dark);
  border: 1px solid var(--color-border);
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.btn-cancel:hover {
  background: rgba(145, 245, 173, 0.18);
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>

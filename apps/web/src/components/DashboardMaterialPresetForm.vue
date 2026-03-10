<template>
  <div class="material-form-overlay" role="dialog" aria-modal="true">
    <div class="material-form">
      <header class="form-header">
        <div>
          <p class="eyebrow">Předvolby materiálů</p>
          <h3>{{ mode === 'edit' ? 'Upravit předvolbu materiálu' : 'Přidat předvolbu materiálu' }}</h3>
          <p class="subtext">Vytvořte šablonu pro rychlé přidávání materiálů do kurzů.</p>
        </div>
      </header>

      <form @submit.prevent="handleSubmit" class="form-body">
        <div class="form-row">
          <div class="field">
            <label for="preset-name">Název předvolby</label>
            <input id="preset-name" v-model="fields.name" type="text" required placeholder="Např. Prezentační slidy" />
          </div>
          <div class="field">
            <label for="description">Popis</label>
            <input id="description" v-model="fields.description" type="text" placeholder="Týden 2" />
          </div>
        </div>

        <div class="field">
          <label class="label">Typ materiálu</label>
          <div class="radio-row">
            <label class="radio">
              <input type="radio" value="file" v-model="fields.type" />
              Nahrát soubor
            </label>
            <label class="radio">
              <input type="radio" value="url" v-model="fields.type" />
              Externí odkaz
            </label>
          </div>
        </div>

        <div v-if="fields.type === 'url'" class="field">
          <label for="url">URL odkaz</label>
          <input
              id="url"
              v-model="fields.url"
              type="url"
              :required="fields.type === 'url'"
              placeholder="https://example.com/zdroj"
          />
          <p class="hint">Odkaz, který studenti otevřou v nové záložce.</p>
        </div>

        <div v-else class="field">
          <p class="hint">Pro předvolbu typu souboru bude soubor vyžadován při použití předvolby v kurzu.</p>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            Uložit předvolbu
          </button>
          <button type="button" @click="$emit('cancel')" class="btn-secondary">Zrušit</button>
        </div>

        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { api } from "../services/api";

export interface MaterialPresetEditData {
  uuid?: string;
  name?: string;
  type?: 'file' | 'url';
  description?: string | null;
  url?: string | null;
}

const props = defineProps<{
  mode: 'create' | 'edit';
  initial?: MaterialPresetEditData | null;
}>();

const emit = defineEmits<{
  (event: 'saved'): void;
  (event: 'cancel'): void;
}>();

const errorMsg = ref('');

const fields = reactive({
  type: 'file' as 'file' | 'url',
  name: '',
  description: '',
  url: '',
});

watch(
    () => props.initial,
    (value) => {
      if (value) {
        fields.type = value.type ?? 'file';
        fields.name = value.name ?? '';
        fields.description = value.description ?? '';
        fields.url = value.url ?? '';
      } else {
        fields.type = 'file';
        fields.name = '';
        fields.description = '';
        fields.url = '';
      }
    },
    { immediate: true }
);

async function handleSubmit() {
  errorMsg.value = '';

  try {
    const body = {
      name: fields.name,
      type: fields.type,
      description: fields.description || null,
      url: fields.type === 'url' ? fields.url : null,
    };

    const url = props.mode === 'edit' && props.initial?.uuid
        ? `/dashboard/presets/materials/${props.initial.uuid}`
        : `/dashboard/presets/materials`;

    await api(url, {
      method: props.mode === 'edit' ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    emit('saved');
  } catch {
    errorMsg.value = "Nepodařilo se uložit předvolbu.";
  }
}
</script>

<style scoped>
.material-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 40;
}

.material-form {
  width: min(720px, 100%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 18px 50px var(--color-shadow);
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--color-border);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
}

.eyebrow {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--color-accent-strong);
}

.form-header h3 {
  margin: 0;
  font-size: 1.35rem;
  color: var(--color-primary-dark);
}

.subtext {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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

input[type="text"],
input[type="url"],
select {
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.98rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 112, 187, 0.15);
}

.radio-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.radio {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: rgba(145, 245, 173, 0.18);
  cursor: pointer;
}

.radio input {
  accent-color: var(--color-primary);
}

.hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 4px;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary-dark);
  border: 1px solid var(--color-border);
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.btn-secondary:hover {
  background: rgba(145, 245, 173, 0.18);
}

.error-message {
  color: var(--color-primary-dark);
  background: rgba(37, 146, 184, 0.1);
  border: 1px solid var(--color-border);
  padding: 10px 12px;
  border-radius: 10px;
}

@media (max-width: 720px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

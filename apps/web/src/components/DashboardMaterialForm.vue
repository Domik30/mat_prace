<template>
  <div class="material-form-overlay" role="dialog" aria-modal="true">
    <div class="material-form">
      <header class="form-header">
        <div>
          <p class="eyebrow">Materiály</p>
          <h3>{{ mode === 'edit' ? 'Upravit materiál' : 'Přidat materiál' }}</h3>
          <p class="subtext">Nahrajte soubor nebo sdílejte odkaz, který studenti otevřou přímo.</p>
        </div>
      </header>

      <form @submit.prevent="handleSubmit" class="form-body">
        <div class="form-row">
          <div class="field">
            <label for="name">Název</label>
            <input id="name" v-model="fields.name" type="text" required placeholder="Prezentační slidy" />
          </div>
          <div class="field">
            <label for="description">Popis</label>
            <input id="description" v-model="fields.description" type="text" required placeholder="Týden 2" />
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

        <div v-if="fields.type === 'file'" class="field">
          <label for="file-upload">
            <img :src="uploadIcon" alt="" class="icon-inline" aria-hidden="true" />
            Nahrát soubor
          </label>
          <input
              id="file-upload"
              type="file"
              @change="onFileChange"
              :required="mode === 'create' || (mode === 'edit' && props.initial?.type !== 'file')"
          />
          <p class="hint">PDF, PPTX, obrázky nebo jakýkoliv soubor ke stažení.</p>
          <p v-if="mode === 'edit' && props.initial?.type === 'file'" class="hint">Nechte prázdné pro zachování současného souboru.</p>
        </div>

        <div v-else class="field">
          <label for="url">URL odkaz</label>
          <input
              id="url"
              v-model="fields.url"
              type="url"
              required
              placeholder="https://example.com/zdroj"
          />
          <p class="hint">Odkaz, který studenti otevřou v nové záložce.</p>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            <img :src="uploadIcon" alt="" class="icon-inline" aria-hidden="true" />
            Uložit
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
import uploadIcon from '../assets/upload-blue.svg';

export interface MaterialEditData {
  uuid?: string;
  type?: 'file' | 'url';
  name?: string;
  description?: string;
  url?: string;
  moduleUuid?: string | null;
}

const props = defineProps<{
  mode: 'create' | 'edit';
  initial?: MaterialEditData | null;
  courseId: string;
  modules?: Array<{ uuid: string; title: string }>;
  defaultGroupUuid?: string | null;
}>();

const emit = defineEmits<{
  (event: 'saved'): void;
  (event: 'cancel'): void;
}>();

const errorMsg = ref('');

/**
 * Reactive text fields only
 */
const fields = reactive({
  type: 'file' as 'file' | 'url',
  name: '',
  description: '',
  url: '',
  moduleUuid: '' as string,
});

/**
 * File must be a ref (NOT reactive)
 */
const file = ref<File | null>(null);

watch(
    () => props.initial,
    (value) => {
      if (value) {
        fields.type = value.type ?? 'file';
        fields.name = value.name ?? '';
        fields.description = value.description ?? '';
        fields.url = value.url ?? '';
        fields.moduleUuid = value.moduleUuid ?? '';
        file.value = null;
      } else {
        fields.type = 'file';
        fields.name = '';
        fields.description = '';
        fields.url = '';
        fields.moduleUuid = props.defaultGroupUuid ?? '';
        file.value = null;
      }
    },
    { immediate: true }
);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

async function handleSubmit() {
  errorMsg.value = '';

  try {
    if (fields.type === 'file') {
      // File is required when creating, or when editing and changing from URL to file
      if (!file.value && (props.mode === 'create' || (props.mode === 'edit' && props.initial?.type !== 'file'))) {
        throw new Error("Soubor je povinný");
      }

      const fd = new FormData();
      fd.append("type", "file");
      fd.append("name", fields.name);
      fd.append("description", fields.description);
      if (fields.moduleUuid) {
        fd.append("moduleUuid", fields.moduleUuid);
      }

      // Always append file if provided (required when creating or changing type)
      if (file.value) {
        fd.append("file", file.value);
      }

      const url =
          props.mode === 'edit' && props.initial?.uuid
              ? `/courses/${props.courseId}/materials/${props.initial.uuid}`
              : `/courses/${props.courseId}/materials`;

      await api(url, {
        method: props.mode === 'edit' ? "PUT" : "POST",
        body: fd,
      });

    } else {
      const body = {
        type: "url",
        name: fields.name,
        description: fields.description,
        url: fields.url,
        moduleUuid: fields.moduleUuid || null,
      };

      const url =
          props.mode === 'edit' && props.initial?.uuid
              ? `/courses/${props.courseId}/materials/${props.initial.uuid}`
              : `/courses/${props.courseId}/materials`;

      await api(url, {
        method: props.mode === 'edit' ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    emit('saved');
  } catch {
    errorMsg.value = "Nepodařilo se uložit materiál.";
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
input[type="file"],
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
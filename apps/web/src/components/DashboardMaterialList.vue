<template>
  <ul class="material-list">
    <li
        v-for="material in materials"
        :key="material.uuid"
        class="material-row"
        :draggable="canManage"
        @dragstart="onDragStart(material, $event)"
    >
      <div class="material-main">
        <div class="title-row">
          <strong class="name">{{ material.name }}</strong>
          <span v-if="material.groupName" class="badge-group">{{ material.groupName }}</span>
        </div>

        <p class="description" v-if="material.description">{{ material.description }}</p>

        <div class="actions">
          <a
              v-if="material.type === 'file' && material.fileUrl"
              :href="absoluteUrl(material.fileUrl)"
              target="_blank"
              rel="noopener"
              download
              class="link"
          >
            <img :src="uploadIcon" alt="" class="icon-inline" aria-hidden="true" />
            Stáhnout
          </a>

          <a
              v-else-if="material.type === 'url' && material.url"
              :href="material.url"
              target="_blank"
              rel="noopener"
              class="link"
          >
            Otevřít odkaz
          </a>

          <span v-if="material.type === 'file' && material.mimeType" class="meta"> — {{ material.mimeType }}</span>
          <span v-if="material.type === 'file' && material.sizeBytes" class="meta"> — {{ humanFileSize(material.sizeBytes) }}</span>
        </div>
      </div>

      <div class="row-actions" v-if="canManage">
        <button class="btn-ghost" @click="$emit('change-group', material)">Změnit skupinu</button>
        <button class="btn-ghost" @click="emitEdit(material)">Upravit</button>
        <button class="btn-delete" @click="emitDelete(material)">Smazat</button>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import uploadIcon from '../assets/upload-blue.svg';

export interface FileMaterial {
  uuid: string;
  type: 'file';
  name: string;
  description?: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  groupName?: string;
}
export interface UrlMaterial {
  uuid: string;
  type: 'url';
  name: string;
  description?: string;
  url: string;
  faviconUrl?: string;
  groupName?: string;
}
export type Material = FileMaterial | UrlMaterial;

const props = defineProps<{
  materials: Material[];
  canManage?: boolean;
}>();

props.canManage

const emit = defineEmits<{
  (event: 'edit', material: Material): void;
  (event: 'delete', material: Material): void;
  (event: 'drag-start', payload: { uuid: string; event: DragEvent }): void;
  (event: 'change-group', material: Material): void;
}>();

function emitEdit(material: Material) {
  emit('edit', material);
}

function emitDelete(material: Material) {
  emit('delete', material);
}

function onDragStart(material: Material, ev: DragEvent) {
  if (!props.canManage) return;
  emit('drag-start', { uuid: material.uuid, event: ev });
}

function absoluteUrl(path?: string): string {
  if (!path) return '#';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path;
}

function humanFileSize(bytes?: number): string {
  if (!bytes) return '';
  const thresh = 1024;
  if (bytes < thresh) return bytes + " B";
  const units = ['KB', 'MB', 'GB', 'TB'];
  let u = -1;
  let n = bytes!;
  do {
    n /= thresh;
    ++u;
  } while (n >= thresh && u < units.length - 1);
  return n.toFixed(1) + ' ' + units[u];
}
</script>

<style scoped>
.material-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.material-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(145, 245, 173, 0.15);
}

.material-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name {
  font-weight: 700;
  color: var(--color-primary-dark);
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.description {
  margin: 0;
  color: var(--color-text-muted);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.link:hover {
  text-decoration: underline;
}

.meta {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-primary-dark);
}

.btn-delete {
  background: var(--color-teal-strong);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-ghost:hover {
  background: rgba(145, 245, 173, 0.18);
}

.btn-delete:hover {
  background: var(--color-primary-dark);
}

@media (max-width: 640px) {
  .material-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .row-actions {
    width: 100%;
  }
}

.badge-group {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 112, 187, 0.08);
  color: var(--color-primary-dark);
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
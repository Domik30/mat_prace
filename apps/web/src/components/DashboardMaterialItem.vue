<template>
  <li class="material-item">
    <div class="left">
      <div class="title-row">
        <strong class="name">{{ material.name }}</strong>
        <span class="type" v-if="material.type === 'file'">Soubor</span>
        <span class="type" v-else>Odkaz</span>
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
    <div class="right" v-if="canManage">
      <button class="btn-edit" @click="$emit('edit', material)">Upravit</button>
      <button class="btn-delete" @click="$emit('delete', material)">Smazat</button>
    </div>
  </li>
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
}
export interface UrlMaterial {
  uuid: string;
  type: 'url';
  name: string;
  description?: string;
  url: string;
  faviconUrl?: string;
}
export type Material = FileMaterial | UrlMaterial;

const props = defineProps<{
  material: Material,
  canManage?: boolean
}>();

props.canManage == false;

const emit = defineEmits<{
  (event: "edit", material: Material): void;
  (event: "delete", material: Material): void;
}>();
emit.length

function absoluteUrl(path?: string): string {
  if (!path) return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}
function humanFileSize(bytes?: number): string {
  if (!bytes) return "";
  const thresh = 1024;
  if (bytes < thresh) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let u = -1;
  let n = bytes!;
  do {
    n /= thresh;
    ++u;
  } while (n >= thresh && u < units.length - 1);
  return n.toFixed(1) + " " + units[u];
}
</script>
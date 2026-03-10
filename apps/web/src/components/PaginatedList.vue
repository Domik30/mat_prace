<template>
  <div class="paginated-list">
    <slot :items="paginatedItems" />
    <div v-if="props.items.length > 0" class="pagination">
      <button
          type="button"
          class="btn-page"
          :disabled="currentPage <= 1"
          @click="currentPage = Math.max(1, currentPage - 1)"
      >
        ‹ Předchozí
      </button>
      <span class="page-info">
        Stránka {{ currentPage }} / {{ totalPages }}
      </span>
      <button
          type="button"
          class="btn-page"
          :disabled="currentPage >= totalPages"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
      >
        Další ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  items: any[];
  pageSize: number;
}>();

const currentPage = ref(1);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.items.length / props.pageSize))
);

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize;
  return props.items.slice(start, start + props.pageSize);
});

watch(
  () => props.items.length,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
    }
  }
);
</script>

<style scoped>
.paginated-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.btn-page {
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.btn-page:hover:not(:disabled) {
  background: rgba(145, 245, 173, 0.18);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}
</style>

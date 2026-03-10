<!-- src/views/CoursesView.vue -->
<template>
  <div class="page">
    <div class="container">
      <header class="head">
        <div>
          <p class="badge">📚 Katalog</p>
          <h1>Kurzy</h1>
          <p class="muted">Prohlédněte kurzy, otevřete materiály a vyplňte kvízy, pokud jsou k dispozici.</p>
        </div>
      </header>

      <div class="search card card--padded">
        <label class="search-label" for="course-search">Hledat</label>
        <input
          id="course-search"
          v-model="searchQuery"
          type="text"
          placeholder="Hledat kurzy podle názvu…"
          class="search-input"
        />
      </div>

      <div v-if="loading" class="state muted">Načítání kurzů…</div>
      <div v-else-if="filteredCourses.length === 0" class="state">
        <div class="card card--padded empty">
          <p class="empty-title">Žádné výsledky</p>
          <p class="muted">Zkuste kratší dotaz nebo vymazat hledání.</p>
          <button class="btn btn-secondary" type="button" @click="searchQuery = ''">Vymazat hledání</button>
        </div>
      </div>

      <div v-else class="courses-grid" aria-label="Courses">
        <template v-for="course in filteredCourses" :key="course.uuid">
          <router-link
            v-if="course.state === 'live'"
            class="card card--padded card--interactive course-card"
            :to="`/courses/${course.uuid}`"
          >
            <div class="course-card-head">
              <h3 class="title">{{ course.name }}</h3>
              <span class="status-badge status-live">Živý</span>
            </div>
            <p class="desc">{{ course.description }}</p>
            <span class="view-more">Zobrazit detail →</span>
          </router-link>
          <div
            v-else
            class="card card--padded course-card course-card--disabled"
            aria-disabled="true"
          >
            <div class="course-card-head">
              <h3 class="title">{{ course.name }}</h3>
              <span class="status-badge" :class="`status-${course.state || 'draft'}`">
                {{ course.state === 'paused' ? 'Pozastaveno' : 'Naplánováno' }}
              </span>
            </div>
            <p class="desc">{{ course.description }}</p>
            <span v-if="course.state === 'scheduled' && course.liveAt" class="release release-highlight">
              Zveřejní se: {{ formatReleaseDate(course.liveAt) }} v {{ formatReleaseTime(course.liveAt) }}
            </span>
            <span v-else-if="course.state === 'scheduled' && !course.liveAt" class="release release-highlight">Datum zveřejnění není nastaveno</span>
            <span class="view-more muted">Kurz není k otevření</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { api, API_BASE } from '../services/api';

interface Course {
  uuid: string;
  name: string;
  description: string;
  state?: string;
  liveAt?: string | null;
}

const courses = ref<Course[]>([]);
const searchQuery = ref('');
const loading = ref(true);

// Catalog API returns live, scheduled, and paused; filter by search only
const filteredCourses = computed(() => {
  const list = courses.value;
  if (!searchQuery.value) return list;
  const query = searchQuery.value.toLowerCase();
  return list.filter((c) => c.name.toLowerCase().includes(query));
});

function formatReleaseDate(liveAt: string): string {
  if (!liveAt) return '';
  const d = new Date(liveAt.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? liveAt.slice(0, 10) : d.toLocaleDateString('cs-CZ');
}

function formatReleaseTime(liveAt: string): string {
  if (!liveAt) return '';
  const d = new Date(liveAt.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

async function loadCourses() {
  try {
    courses.value = await api<Course[]>('/courses');
  } catch (err) {
    courses.value = [];
  } finally {
    loading.value = false;
  }
}

let catalogEs: EventSource | null = null;

onMounted(() => {
  loadCourses();
  catalogEs = new EventSource(`${API_BASE}/courses/catalog/stream`);
  catalogEs.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data?.type === 'course-state-changed') {
        loadCourses();
      }
    } catch {
      // ignore parse errors
    }
  };
});

onBeforeUnmount(() => {
  catalogEs?.close();
  catalogEs = null;
});
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

h1 {
  margin: 10px 0 6px;
  color: var(--color-primary-dark);
  line-height: 1.05;
}

.search {
  margin: 14px 0 22px;
}

.search-label {
  display: block;
  font-weight: 900;
  color: var(--color-text);
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  padding: 14px 14px;
  font-size: 1.05rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.75);
}

.search-input:focus {
  outline: none;
  border-color: rgba(0, 112, 187, 0.55);
  box-shadow: 0 0 0 4px rgba(0, 112, 187, 0.12);
  background: #fff;
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}

.course-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.title {
  margin: 0;
  color: var(--color-text);
  font-size: 1.35rem;
  flex: 1;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-scheduled {
  background: #fff3cd;
  color: #856404;
}

.status-live {
  background: #d4edda;
  color: #155724;
}

.status-paused {
  background: #f8d7da;
  color: #721c24;
}

.desc {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.release {
  display: block;
  margin-top: 8px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.release-highlight {
  font-weight: 600;
  color: #856404;
}

.view-more {
  display: inline-flex;
  margin-top: 14px;
  color: var(--color-primary-dark);
  font-weight: 900;
}

.course-card--disabled {
  cursor: default;
  opacity: 0.9;
}

.course-card--disabled:hover {
  transform: none;
}

.state {
  padding: 22px 0;
}

.empty {
  text-align: center;
}

.empty-title {
  margin: 0 0 6px;
  font-weight: 900;
  color: var(--color-text);
}
</style>
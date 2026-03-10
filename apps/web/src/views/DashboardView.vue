<template>
    <DashboardLayout name="Přehled kurzů">
    <div class="presets-section">
      <div class="presets-header">
        <div>
          <h2>Šablony</h2>
          <p class="section-description">Vytvořte šablony pro rychlé přidávání materiálů, kvízů a oznámení do kurzů.</p>
        </div>
        <router-link to="/dashboard/presets" class="btn-manage">Spravovat šablony</router-link>
      </div>
    </div>

    <div class="create-course-section">
      <div class="create-course-header">
        <div>
          <h2>Vytvořit nový kurz</h2>
          <p class="create-course-description">Začněte vytvořením nového kurzu a přidejte obsah pomocí šablon nebo vytvořte vše od začátku.</p>
        </div>
        <router-link to="/dashboard/courses/create" class="btn-create-course">+ Vytvořit kurz</router-link>
      </div>
    </div>

    <div class="courses-list">
      <h2>Kurzy</h2>
      <div v-if="loading" class="loading"><p>Načítání kurzů…</p></div>
      <div v-else-if="courses.length === 0" class="empty"><p>Žádné kurzy k dispozici</p></div>
      <div v-else class="courses-grid">
        <div v-for="course in courses" :key="course.uuid" class="course-card">
          <div class="course-header">
            <h3>{{ course.name }}</h3>
            <span class="status-badge" :class="`status-${course.state || 'draft'}`">
              {{ getStateLabel(course.state || 'draft') }}
            </span>
          </div>
          <p>{{ course.description || 'Bez popisu' }}</p>
          <p class="course-stats">
            <span>Materiály: {{ (course as any).materialsCount ?? 0 }}</span>
            <span>Kvízy: {{ (course as any).quizzesCount ?? 0 }}</span>
            <span>Oznámení: {{ (course as any).feedsCount ?? 0 }}</span>
          </p>
          <div class="card-actions">
            <router-link v-if="course.state !== 'archived'" :to="`/dashboard/courses/${course.uuid}/edit`" class="btn-edit">Upravit</router-link>
            <router-link v-if="course.state === 'archived'" :to="`/dashboard/courses/${course.uuid}/edit`" class="btn-edit">Zobrazit statistiky</router-link>
            <button @click="confirmDelete(course)" class="btn-delete">Smazat</button>
          </div>
        </div>
      </div>
    </div>

  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DashboardLayout from '../components/DashboardLayout.vue';
import { api } from '../services/api';

interface CourseSummary {
  uuid: string;
  name: string;
  description: string;
  state?: string;
  liveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const courses = ref<CourseSummary[]>([]);
const loading = ref(true);

function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    draft: 'Koncept',
    scheduled: 'Naplánováno',
    live: 'Živý',
    paused: 'Pozastaveno',
    archived: 'Archivováno',
  };
  return labels[state] || state;
}

async function loadCourses() {
  loading.value = true;
  try {
    const res = await api<(CourseSummary & { materialsCount?: number; quizzesCount?: number; feedsCount?: number })[]>('/dashboard/courses');
    courses.value = Array.isArray(res) ? res : [];
  } catch (err) {
    courses.value = [];
  } finally {
    loading.value = false;
  }
}

async function confirmDelete(course: CourseSummary) {
  if (!confirm(`Opravdu chcete smazat kurz "${course.name}"? Tuto akci nelze vrátit zpět.`)) return;
  try {
    await api(`/dashboard/courses/${course.uuid}`, { method: 'DELETE' });
    courses.value = courses.value.filter(c => c.uuid !== course.uuid);
  } catch (err) {
    alert('Nepodařilo se smazat kurz.');
  }
}

onMounted(loadCourses);
</script>

<style scoped>
.presets-section {
  margin-bottom: 40px;
  padding: 24px;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.presets-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.presets-section h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: var(--color-primary-dark);
}

.section-description {
  margin: 0;
  color: var(--color-text-muted);
}

.btn-manage {
  background: var(--color-accent-strong);
  color: var(--color-text);
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.btn-manage:hover {
  background: var(--color-accent);
}

.create-course-section {
  margin-bottom: 40px;
  padding: 24px;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.create-course-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.create-course-section h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: var(--color-primary-dark);
}

.create-course-description {
  margin: 0;
  color: var(--color-text-muted);
}

.btn-create-course {
  background: var(--color-accent-strong);
  color: var(--color-text);
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.btn-create-course:hover {
  background: var(--color-accent);
}

.courses-list { min-height: 60vh; }
.courses-list h2 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  color: var(--color-primary-dark);
}
.loading { text-align: center; padding: 80px 20px; color: var(--color-text-muted); font-size: 1.2rem; }
.empty { text-align: center; padding: 60px 20px; color: var(--color-text-muted); }
.courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 30px; }
.course-card { background: var(--color-surface); border-radius: 12px; padding: 25px; box-shadow: 0 4px 15px var(--color-shadow); border: 1px solid var(--color-border); }
.course-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 15px; }
.course-card h3 { margin: 0; font-size: 1.6rem; color: var(--color-primary-dark); flex: 1; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
.status-draft { background: #e0e0e0; color: #666; }
.status-scheduled { background: #fff3cd; color: #856404; }
.status-live { background: #d4edda; color: #155724; }
.status-paused { background: #f8d7da; color: #721c24; }
.status-archived { background: #d1ecf1; color: #0c5460; }
.course-stats { margin: 8px 0; font-size: 0.9rem; color: var(--color-text-muted); display: flex; gap: 16px; flex-wrap: wrap; }
.course-stats .muted { color: var(--color-text-muted); }
.card-actions { display: flex; gap: 12px; margin-top: 10px; }
.btn-add { background: var(--color-accent-strong); color: var(--color-text); padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
.btn-add:hover { background: var(--color-accent); }
.btn-edit { background: var(--color-primary); color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; }
.btn-edit:hover { background: var(--color-primary-dark); }
.btn-delete { background: var(--color-teal-strong); color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-delete:hover { background: var(--color-primary-dark); }
</style>
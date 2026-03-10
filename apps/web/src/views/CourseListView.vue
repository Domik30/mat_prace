<!-- src/views/CoursesListView.vue -->
<template>
    <DashboardLayout name="Všechny kurzy">
    <template #actions>
      <router-link to="/dashboard/courses/create" class="btn-add">
        + Přidat nový kurz
      </router-link>
    </template>

    <div class="courses-list">
      <div v-if="loading" class="loading">
        <p>Načítání kurzů…</p>
      </div>

      <div v-else-if="courses.length === 0" class="empty">
        <p>Zatím žádné kurzy k dispozici.</p>
        <router-link to="/dashboard/courses/create" class="btn-add">
          + Vytvořit první kurz
        </router-link>
      </div>

      <div v-else class="courses-grid">
        <div v-for="course in courses" :key="course.uuid" class="course-card">
          <div class="course-header">
            <h3>{{ course.name }}</h3>
            <span class="status-badge" :class="`status-${course.state || 'draft'}`">
              {{ getStateLabel(course.state || 'draft') }}
            </span>
          </div>
          <p class="description">
            {{ course.description || 'Bez popisu.' }}
          </p>

          <div class="card-actions">
            <router-link :to="`/dashboard/courses/${course.uuid}/edit`" class="btn-edit">
              Upravit
            </router-link>
            <button @click="confirmDelete(course)" class="btn-delete">
              Smazat
            </button>
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

interface Course {
  uuid: string;
  name: string;
  description: string;
  state?: string;
  liveAt?: string | null;
}

const courses = ref<Course[]>([]);
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
    courses.value = await api<Course[]>('/dashboard/courses');
  } catch (err) {
    console.error('Failed to load courses:', err);
    courses.value = [];
    alert('Nepodařilo se načíst kurzy. Zkuste to znovu.');
  } finally {
    loading.value = false;
  }
}

async function confirmDelete(course: Course) {
  if (!confirm(`Opravdu chcete smazat kurz "${course.name}"? Tuto akci nelze vrátit zpět.`)) {
    return;
  }

  try {
    await api(`/courses/${course.uuid}`, {
      method: 'DELETE',
    });

    alert('Kurz byl úspěšně smazán.');
    await loadCourses(); // Refresh list
  } catch (err) {
    console.error('Failed to delete course:', err);
    alert('Nepodařilo se smazat kurz. Zkuste to znovu.');
  }
}

onMounted(loadCourses);
</script>

<style scoped>
.courses-list {
  min-height: 60vh;
}

.loading {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-muted);
  font-size: 1.2rem;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
}

.course-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 15px var(--color-shadow);
  transition: border-color 0.2s, box-shadow 0.2s;
  border: 1px solid var(--color-border);
}

.course-card:hover { border-color: rgba(37, 146, 184, 0.34); }

.course-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 15px; }
.course-card h3 {
  margin: 0;
  font-size: 1.6rem;
  color: var(--color-primary-dark);
  flex: 1;
}
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
.status-draft { background: #e0e0e0; color: #666; }
.status-scheduled { background: #fff3cd; color: #856404; }
.status-live { background: #d4edda; color: #155724; }
.status-paused { background: #f8d7da; color: #721c24; }
.status-archived { background: #d1ecf1; color: #0c5460; }

.description {
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 25px;
  min-height: 60px;
}

.card-actions {
  display: flex;
  gap: 12px;
}

.btn-add {
  display: inline-block;
  background: var(--color-accent-strong);
  color: var(--color-text);
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: background 0.2s;
}

.btn-add:hover {
  background: var(--color-accent);
}

.btn-edit {
  background: var(--color-primary);
  color: white;
  padding: 10px 18px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
}

.btn-edit:hover {
  background: var(--color-primary-dark);
}

.btn-delete {
  background: var(--color-teal-strong);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-delete:hover {
  background: var(--color-primary-dark);
}
</style>
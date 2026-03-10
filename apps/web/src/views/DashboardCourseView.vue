<template>
  <DashboardLayout :name="course ? course.name : 'Course'">
    <template #actions>
      <router-link :to="`/dashboard/courses/${routeUuid}/edit`" class="btn-edit">Upravit kurz</router-link>
    </template>

    <div class="course-container">
      <div v-if="loading" class="loading">Načítání…</div>

      <div v-else-if="course" class="content">
        <h2 class="course-title">{{ course.name }}</h2>
        <p class="course-desc">{{ course.description }}</p>

        <section v-if="groups.length" class="section">
          <h3>Skupiny</h3>
          <PaginatedList :items="groups" :page-size="5">
            <template #default="{ items: paginatedGroups }">
          <div class="group-list">
            <div
                v-for="group in paginatedGroups"
                :key="group.uuid"
                class="group-card"
            >
              <header
                  class="group-head"
                  @click="toggleGroup(group.uuid)"
                  role="button"
                  tabindex="0"
                  @keydown.enter="toggleGroup(group.uuid)"
              >
                <span class="group-toggle">{{ expandedGroupUuid === group.uuid ? '▼' : '▶' }}</span>
                <h4 class="group-title">{{ group.title }}</h4>
                <p v-if="group.description" class="group-desc">{{ group.description }}</p>
              </header>
              <div v-show="expandedGroupUuid === group.uuid" class="group-body">
                <div v-if="(group.feed ?? []).length" class="group-block">
                  <h5 class="group-subtitle">Oznámení</h5>
                  <ul class="card-list">
                    <li v-for="item in (group.feed ?? [])" :key="item.uuid" class="card-row">
                          <p class="message">{{ feedPreview(item.message) }}</p>
                          <span class="timestamp">{{ formatDate(item.createdAt) }}</span>
                        </li>
                  </ul>
                </div>
                <div v-if="(group.materials ?? []).length" class="group-block">
                  <h5 class="group-subtitle">Materiály</h5>
                  <DashboardMaterialList
                          :materials="group.materials ?? []"
                          :canManage="isLoggedIn"
                          @edit="onEdit"
                          @delete="onDelete"
                      />
                </div>
                <div v-if="(group.quizzes ?? []).length" class="group-block">
                  <h5 class="group-subtitle">Kvízy</h5>
                  <ul class="quiz-list">
                    <li v-for="q in (group.quizzes ?? [])" :key="q.uuid" class="quiz-row">
                          <strong>{{ q.title }}</strong>
                          <router-link :to="`/dashboard/courses/${routeUuid}/edit`" class="btn-ghost">Upravit kvíz</router-link>
                        </li>
                  </ul>
                </div>
                <p v-if="!(group.feed ?? []).length && !(group.materials ?? []).length && !(group.quizzes ?? []).length" class="muted">Zatím žádný obsah.</p>
              </div>
            </div>
          </div>
            </template>
          </PaginatedList>
        </section>

        <section v-if="ungroupedMaterials.length || ungroupedQuizzes.length || ungroupedFeed.length" class="section">
          <h3>Nezařazené</h3>
          <div v-if="ungroupedFeed.length" class="group-block">
            <h5 class="group-subtitle">Oznámení</h5>
            <ul class="card-list">
              <li v-for="item in ungroupedFeed" :key="item.uuid" class="card-row">
                    <p class="message">{{ feedPreview(item.message) }}</p>
                    <span class="timestamp">{{ formatDate(item.createdAt) }}</span>
                  </li>
                </ul>
          </div>
          <div v-if="ungroupedMaterials.length" class="group-block">
            <h5 class="group-subtitle">Materiály</h5>
            <DashboardMaterialList
                    :materials="ungroupedMaterials"
                    :canManage="isLoggedIn"
                    @edit="onEdit"
                    @delete="onDelete"
                />
          </div>
          <div v-if="ungroupedQuizzes.length" class="group-block">
            <h5 class="group-subtitle">Kvízy</h5>
            <ul class="quiz-list">
              <li v-for="q in ungroupedQuizzes" :key="q.uuid" class="quiz-row">
                    <strong>{{ q.title }}</strong>
                    <router-link :to="`/dashboard/courses/${routeUuid}/edit`" class="btn-ghost">Upravit kvíz</router-link>
                  </li>
                </ul>
          </div>
        </section>

        <section v-if="groups.length === 0 && materials.length === 0 && quizzes.length === 0 && feed.length === 0" class="section">
          <p class="empty">Kurz zatím nemá žádný obsah. Přidejte materiály, kvízy a oznámení v editoru kurzu.</p>
        </section>

        <section v-if="isLoggedIn" class="materials-section">
          <div class="materials-header">
            <h3>Přidat materiál</h3>
            <button @click="startCreate" class="btn-add">+ Přidat materiál</button>
          </div>
          <DashboardMaterialForm
              v-if="showForm"
              :courseId="routeUuid"
              :mode="formMode"
              :initial="editingMaterial"
              @saved="onSaved"
              @cancel="onCancel"
          />
        </section>
      </div>

      <div v-else class="not-found">
        Kurz nenalezen.
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import DashboardLayout from "../components/DashboardLayout.vue";
import DashboardMaterialList from "../components/DashboardMaterialList.vue";
import DashboardMaterialForm from "../components/DashboardMaterialForm.vue";
import PaginatedList from "../components/PaginatedList.vue";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const routeUuid = String(route.params.uuid || "");

const course = ref<any | null>(null);
const materials = ref<any[]>([]);
const quizzes = ref<any[]>([]);
const feed = ref<any[]>([]);
const groups = ref<any[]>([]);
const loading = ref(true);

const auth = useAuthStore();
const isLoggedIn = computed(() => !!auth.isLoggedIn);

const expandedGroupUuid = ref<string | null>(null);

function toggleGroup(uuid: string) {
  expandedGroupUuid.value = expandedGroupUuid.value === uuid ? null : uuid;
}

const showForm = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingMaterial = ref<any | null>(null);

const ungroupedMaterials = computed(() => materials.value.filter((m) => !m.moduleUuid));
const ungroupedQuizzes = computed(() => quizzes.value.filter((q) => !q.moduleUuid));
const ungroupedFeed = computed(() => feed.value.filter((f) => !f.moduleUuid));

function feedPreview(msg: string) {
  const cleaned = (msg ?? "").replace(/\*\*/g, "");
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

async function loadCourse() {
  loading.value = true;
  try {
    const raw = await api<{ materials?: any[]; quizzes?: any[]; feed?: any[]; groups?: any[] }>(`/dashboard/courses/${routeUuid}`);
    course.value = raw;
    materials.value = raw?.materials ?? [];
    quizzes.value = raw?.quizzes ?? [];
    feed.value = raw?.feed ?? [];
    groups.value = raw?.groups ?? [];
    if (groups.value.length > 0 && !expandedGroupUuid.value) {
      expandedGroupUuid.value = groups.value[0].uuid;
    }
  } catch (err) {
    console.error("Failed to load course:", err);
    course.value = null;
    materials.value = [];
    quizzes.value = [];
    feed.value = [];
    groups.value = [];
  } finally {
    loading.value = false;
  }
}

function startCreate() {
  editingMaterial.value = null;
  formMode.value = "create";
  showForm.value = true;
}

function onEdit(material: any) {
  editingMaterial.value = material;
  formMode.value = "edit";
  showForm.value = true;
}

async function onDelete(material: any) {
  if (!confirm(`Smazat materiál "${material.name}"?`)) return;
  try {
    await api(`/dashboard/courses/${routeUuid}/materials/${material.uuid}`, { method: "DELETE" });
    await loadCourse();
  } catch {
    alert("Nepodařilo se smazat materiál.");
  }
}

async function onSaved() {
  showForm.value = false;
  editingMaterial.value = null;
  await loadCourse();
}

function onCancel() {
  showForm.value = false;
  editingMaterial.value = null;
}

onMounted(loadCourse);
</script>

<style scoped>
.course-container { padding: 12px; }
.loading { padding: 40px; color: var(--color-text-muted); }
.content { background: white; padding: 24px; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 6px 16px var(--color-shadow); }
.course-title { margin: 0 0 10px; color: var(--color-primary-dark); }
.course-desc { color: var(--color-text-muted); margin-bottom: 18px; }
.section { margin-top: 24px; }
.section h3 { margin: 0 0 16px; color: var(--color-primary-dark); }
.group-list { display: grid; gap: 12px; }
.group-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 0; overflow: hidden; background: rgba(145, 245, 173, 0.1); }
.group-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 16px; cursor: pointer; }
.group-head:hover { background: rgba(145, 245, 173, 0.15); }
.group-toggle { font-size: 0.8rem; color: var(--color-text-muted); }
.group-title { margin: 0; font-size: 1.1rem; color: var(--color-primary-dark); flex: 1; }
.group-desc { margin: 4px 0 0; width: 100%; color: var(--color-text-muted); font-size: 0.95rem; }
.group-body { padding: 0 16px 16px; border-top: 1px solid var(--color-border); }
.group-block { margin-top: 12px; }
.group-subtitle { margin: 0 0 8px; font-size: 1rem; color: var(--color-primary-dark); }
.card-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.card-row { display: flex; justify-content: space-between; padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; }
.message { margin: 0; }
.timestamp { color: var(--color-text-muted); font-size: 0.9rem; }
.quiz-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.quiz-row { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; background: rgba(145, 245, 173, 0.14); }
.quiz-row .meta { color: var(--color-text-muted); font-size: 0.9rem; }
.muted { color: var(--color-text-muted); }
.empty { margin: 0; color: var(--color-text-muted); }
.materials-section { margin-top: 24px; }
.materials-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.btn-add { background: var(--color-accent-strong); color: var(--color-text); padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; }
.btn-add:hover { background: var(--color-accent); }
.btn-edit { background: var(--color-primary); color: white; padding: 8px 12px; border-radius: 8px; text-decoration: none; }
.btn-edit:hover { background: var(--color-primary-dark); }
.btn-ghost { color: var(--color-primary-dark); padding: 6px 12px; border-radius: 6px; text-decoration: none; border: 1px solid var(--color-border); }
.btn-ghost:hover { background: rgba(145, 245, 173, 0.18); }
</style>

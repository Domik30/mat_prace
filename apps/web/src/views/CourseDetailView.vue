<!-- src/views/CourseDetailView.vue -->
<template>
  <div class="course-detail">
    <div v-if="loading" class="loading">Načítání…</div>

    <div v-else-if="course" class="content">
      <header class="course-header">
        <div>
          <h1>Kurz</h1>
          <h1>{{ course.name }}</h1>
          <p class="description">{{ course.description }}</p>
        </div>
        <router-link to="/courses" class="back-link">← Zpět na kurzy</router-link>
      </header>

      <section v-if="course.groups?.length" class="section">
        <div class="section-head">
          <div>
            <h2>Skupiny</h2>
            <p class="subtext">Materiály, kvízy a oznámení rozdělené do skupin.</p>
          </div>
        </div>

        <PaginatedList :items="course.groups" :page-size="5">
          <template #default="{ items: paginatedGroups }">
        <div class="group-list">
          <div v-for="group in paginatedGroups" :key="group.uuid" class="group-card">
            <header
                class="group-head group-head-clickable"
                :class="{ 'group-head-locked': expandedGroupUuid !== group.uuid && !canExpandGroup(group) }"
                @click="toggleGroup(group)"
                role="button"
                tabindex="0"
                @keydown.enter="toggleGroup(group)"
            >
              <span class="group-toggle">{{ expandedGroupUuid === group.uuid ? '▼' : '▶' }}</span>
              <h3 class="group-title">{{ group.title }}</h3>
              <p v-if="group.description" class="group-desc">{{ group.description }}</p>
            </header>

            <div v-show="expandedGroupUuid === group.uuid">
            <div v-if="groupFeedItems(group.uuid).length" class="group-block">
              <h4 class="group-subtitle">Oznámení</h4>
              <ul class="card-list">
                <li v-for="item in groupFeedItems(group.uuid)" :key="item.uuid" class="card-row card-row-green">
                  <div class="card-main">
                    <div class="card-top">
                      <span class="badge" :class="item.type">{{ item.type }}</span>
                      <span class="timestamp">{{ formatDate(item.createdAt) }}</span>
                      <span v-if="item.edited" class="edited">upraveno</span>
                    </div>
                    <p class="message">{{ stripMarkdownBold(item.message) }}</p>
                  </div>
                </li>
              </ul>
            </div>

            <div v-if="group.materials?.length" class="group-block">
              <h4 class="group-subtitle">Materiály</h4>
              <ul class="card-list">
                <li v-for="m in group.materials" :key="m.uuid" class="card-row card-row-green">
                  <div class="card-main">
                    <strong class="card-title">{{ m.name }}</strong>
                    <p class="card-desc" v-if="m.description">{{ m.description }}</p>
                    <div class="card-actions">
                      <a
                          v-if="m.type === 'file' && m.fileUrl"
                          href="#"
                          class="link"
                          @click.prevent="trackAndOpen('material_download', fullUrl(m.fileUrl), m.uuid)"
                      >
                        <img :src="uploadIcon" alt="" class="icon-inline" aria-hidden="true" />
                        Stáhnout
                      </a>
                      <a
                          v-else-if="m.type === 'url' && m.url"
                          href="#"
                          class="link link-with-favicon"
                          @click.prevent="trackAndOpen('link_click', m.url, m.uuid)"
                      >
                        <img :src="faviconUrl(m.url)" alt="" class="favicon" width="20" height="20" />
                        <span class="link-text">
                          <span class="link-desc" v-if="m.description">{{ m.description }}</span>
                          <span class="link-label">Otevřít odkaz →</span>
                        </span>
                      </a>
                      <span v-if="m.type === 'file' && m.mimeType" class="meta">— {{ m.mimeType }}</span>
                      <span v-if="m.type === 'file' && m.size" class="meta">— {{ humanSize(m.size) }}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <div v-if="group.quizzes?.length" class="group-block">
              <h4 class="group-subtitle">Kvízy</h4>
              <div class="card-list">
                <div v-for="q in group.quizzes" :key="q.uuid" class="card-row card-row-green">
                  <header class="card-head">
                    <div>
                      <strong class="card-title">{{ q.title }}</strong>
                    </div>
                    <button 
                v-if="!q.countOnlyLastAnswer || !hasSubmittedQuiz(q.uuid)"
                class="btn-ghost" 
                @click="openQuiz(q)"
              >
                Vyplnit kvíz
              </button>
              <span v-else class="muted">Již vyplněno</span>
                  </header>
                  <p v-if="activeQuiz && activeQuiz.uuid === q.uuid && submitResult" class="card-result">
                    Poslední skóre: {{ submitResult.score }} / {{ submitResult.maxScore }}
                  </p>
                </div>
              </div>
            </div>

            <p v-if="!groupFeedItems(group.uuid).length && !group.materials?.length && !group.quizzes?.length" class="muted">
              Zatím žádný obsah v této skupině.
            </p>
            </div>
          </div>
        </div>
          </template>
        </PaginatedList>
      </section>

      <!-- Ungrouped Feed -->
      <section class="section" v-if="ungroupedFeed.length">
        <h3 class="section-subtitle">Nezařazené oznámení</h3>
        <ul class="card-list">
          <li v-for="item in ungroupedFeed" :key="item.uuid" class="card-row card-row-green">
            <div class="card-main">
              <div class="card-top">
                <span class="badge" :class="item.type">{{ item.type }}</span>
                <span class="timestamp">{{ formatDate(item.createdAt) }}</span>
                <span v-if="item.edited" class="edited">upraveno</span>
              </div>
              <p class="message">{{ stripMarkdownBold(item.message) }}</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Ungrouped Materials -->
      <section class="section" v-if="ungroupedMaterials.length">
        <h3 class="section-subtitle">Nezařazené materiály</h3>
        <ul class="card-list">
          <li v-for="m in ungroupedMaterials" :key="m.uuid" class="card-row card-row-green">
            <div class="card-main">
              <strong class="card-title">{{ m.name }}</strong>
              <p class="card-desc" v-if="m.description">{{ m.description }}</p>
              <div class="card-actions">
                <a
                    v-if="m.type === 'file' && m.fileUrl"
                    href="#"
                    class="link"
                    @click.prevent="trackAndOpen('material_download', fullUrl(m.fileUrl), m.uuid)"
                >
                  <img :src="uploadIcon" alt="" class="icon-inline" aria-hidden="true" />
                  Stáhnout
                </a>
                <a
                    v-else-if="m.type === 'url' && m.url"
                    href="#"
                    class="link link-with-favicon"
                    @click.prevent="trackAndOpen('link_click', m.url, m.uuid)"
                >
                  <img :src="faviconUrl(m.url)" alt="" class="favicon" width="20" height="20" />
                  <span class="link-text">
                    <span class="link-desc" v-if="m.description">{{ m.description }}</span>
                    <span class="link-label">Otevřít odkaz →</span>
                  </span>
                </a>
                <span v-if="m.type === 'file' && m.mimeType" class="meta">— {{ m.mimeType }}</span>
                <span v-if="m.type === 'file' && m.size" class="meta">— {{ humanSize(m.size) }}</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Ungrouped Quizzes -->
      <section class="section" v-if="ungroupedQuizzes.length">
        <h3 class="section-subtitle">Nezařazené kvízy</h3>
        <div class="card-list">
          <div v-for="q in ungroupedQuizzes" :key="q.uuid" class="card-row card-row-green">
            <header class="card-head">
              <div>
                <strong class="card-title">{{ q.title }}</strong>
              </div>
              <button 
                v-if="!q.countOnlyLastAnswer || !hasSubmittedQuiz(q.uuid)"
                class="btn-ghost" 
                @click="openQuiz(q)"
              >
                Vyplnit kvíz
              </button>
              <span v-else class="muted">Již vyplněno</span>
            </header>
            <p v-if="activeQuiz && activeQuiz.uuid === q.uuid && submitResult" class="card-result">
              Poslední skóre: {{ submitResult.score }} / {{ submitResult.maxScore }}
            </p>
          </div>
        </div>
      </section>

      <!-- Quiz player overlay (pop-up) -->
      <div v-if="activeQuiz" class="quiz-overlay" role="dialog" aria-modal="true">
        <div class="panel quiz-player">
          <div class="panel-head">
            <h3>{{ activeQuiz.title }}</h3>
            <button class="btn-ghost" type="button" @click="closeQuiz">Zavřít</button>
          </div>

          <!-- Show form if quiz hasn't been submitted and (not single-attempt OR not yet submitted) -->
          <form v-if="!submitResult && (!activeQuiz.countOnlyLastAnswer || !hasSubmittedQuiz(activeQuiz.uuid))" @submit.prevent="submitQuiz" class="panel-body">
            <div v-for="(question, idx) in activeQuiz.questions" :key="question.uuid" class="question">
              <p class="q-title">{{ idx + 1 }}. otázka: {{ question.question }}</p>

              <div v-if="question.type === 'singleChoice'" class="options">
                <label v-for="(opt, i) in question.options" :key="i" class="option">
                  <input
                      type="radio"
                      :name="`q-${question.uuid}`"
                      :value="i"
                      v-model.number="answers[question.uuid]!.selectedIndex"
                      required
                  />
                  {{ opt }}
                </label>
              </div>

              <div v-else class="options">
                <label v-for="(opt, i) in question.options" :key="i" class="option">
                  <input
                      type="checkbox"
                      :value="i"
                      v-model="answers[question.uuid]!.selectedIndices"
                  />
                  {{ opt }}
                </label>
              </div>
            </div>

            <div class="form-actions form-actions--submit">
              <button type="submit" class="btn-primary">Odeslat odpovědi</button>
            </div>
          </form>

          <!-- Show message if single-attempt quiz already submitted -->
          <div v-else-if="!submitResult && activeQuiz.countOnlyLastAnswer && hasSubmittedQuiz(activeQuiz.uuid)" class="panel-body">
            <p class="muted">Tento kvíz lze vyplnit pouze jednou a již jste ho vyplnili.</p>
          </div>

          <!-- Show results if quiz was just submitted -->
          <div v-else-if="submitResult" class="result-panel">
            <div class="result-summary">
              <p class="result-score">Skóre: {{ submitResult.score }} / {{ submitResult.maxScore }}</p>
              <p class="muted">Odesláno: {{ submitResult.submittedAt }}</p>
            </div>

            <div class="question-feedback">
              <div
                  v-for="(question, idx) in activeQuiz.questions"
                  :key="question.uuid"
                  class="feedback-item"
                  :class="{ correct: submitResult.correctPerQuestion[idx], wrong: !submitResult.correctPerQuestion[idx] }"
              >
                <p class="q-title">{{ idx + 1 }}. {{ question.question }}</p>
                <p class="user-answer">
                  <strong>Vaše odpověď:</strong>
                  {{ formatUserAnswer(question, answers[question.uuid]) }}
                </p>
                <p class="correct-answer">
                  <strong>Správná odpověď:</strong>
                  {{ formatCorrectAnswer(question) }}
                </p>
              </div>
            </div>
            <button type="button" class="btn-ghost" @click="closeQuiz">Zavřít</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="not-found">
      <h2>Kurz nenalezen</h2>
      <router-link to="/courses">Zpět na kurzy</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, API_BASE } from '../services/api';
import uploadIcon from '../assets/upload-blue.svg';
import PaginatedList from '../components/PaginatedList.vue';

type Question = {
  uuid: string;
  type: 'singleChoice' | 'multipleChoice';
  question: string;
  options: string[];
  correctIndex?: number;
  correctIndices?: number[];
};

type Quiz = {
  uuid: string;
  title: string;
  attemptsCount?: number;
  participantsCount?: number;
  questions: Question[];
  moduleUuid?: string | null;
  countOnlyLastAnswer?: boolean;
  hasSubmitted?: boolean;
};

type FeedItem = {
  uuid: string;
  type: 'manual' | 'system';
  message: string;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  moduleUuid?: string | null;
};

type Material = {
  uuid: string;
  type: 'file' | 'url';
  name: string;
  description?: string;
  url?: string;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  moduleUuid?: string | null;
};

type Group = {
  uuid: string;
  title: string;
  description?: string | null;
  materials?: Material[];
  quizzes?: Quiz[];
  feed?: FeedItem[];
};

type Course = {
  uuid: string;
  name: string;
  description?: string;
  materials?: Material[];
  quizzes?: Quiz[];
  feed?: FeedItem[];
  groups?: Group[];
};

type AnswerEntry = {
  selectedIndex?: number;
  selectedIndices?: number[];
};

type CourseStateEvent = {
  type: 'unlock' | 'refresh' | 'course-state-changed' | 'course-deleted';
  entityType?: 'module' | 'material' | 'quiz' | 'feed';
  uuid?: string;
  isUnlocked?: boolean;
  unlockedAt?: string | null;
  state?: string;
  reason?: string;
};

const route = useRoute();
const router = useRouter();
const course = ref<Course | null>(null);
const feed = ref<FeedItem[]>([]);
const loading = ref(true);
const expandedGroupUuid = ref<string | null>(null);

/** A group can be expanded only if it is the first or the previous group is currently expanded (sequential locking). */
function canExpandGroup(group: { uuid: string }) {
  const groups = course.value?.groups ?? [];
  const idx = groups.findIndex((g: any) => g.uuid === group.uuid);
  if (idx < 0) return true;
  if (idx === 0) return true;
  const prev = groups[idx - 1];
  return prev != null && expandedGroupUuid.value === prev.uuid;
}

function toggleGroup(group: { uuid: string }) {
  const uuid = group.uuid;
  if (expandedGroupUuid.value === uuid) {
    expandedGroupUuid.value = null;
  } else if (canExpandGroup(group)) {
    expandedGroupUuid.value = uuid;
  }
}

const activeQuiz = ref<Quiz | null>(null);
const answers = ref<Record<string, AnswerEntry>>({});
const submitResult = ref<any | null>(null);
const submittedQuizUuids = ref<Set<string>>(new Set());

function hasSubmittedQuiz(quizUuid: string): boolean {
  return submittedQuizUuids.value.has(quizUuid);
}

const ungroupedMaterials = computed(() => (course.value?.materials ?? []).filter((m) => !m.moduleUuid));
const ungroupedQuizzes = computed(() => (course.value?.quizzes ?? []).filter((q) => !q.moduleUuid));
const ungroupedFeed = computed(() => feed.value.filter((item) => !item.moduleUuid));

/** Feed items for a group – derived from feed.value so SSE updates (oznámení) reflect immediately */
function groupFeedItems(groupUuid: string) {
  return feed.value.filter((item) => item.moduleUuid === groupUuid);
}

let es: EventSource | null = null;
let stateEs: EventSource | null = null;
let isRefreshingCourseState = false;
let pendingCourseStateRefresh = false;
const hasTrackedCourseOpen = ref(false);

async function loadCourse() {
  const id = route.params.uuid as string;
  try {
    const data = await api<Course>(`/courses/${id}`);
    course.value = data;
    feed.value = data.feed || [];

    if (!hasTrackedCourseOpen.value) {
      try {
        await api(`/courses/${id}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'course_open' }),
        });
      } catch {
        // ignore tracking errors
      } finally {
        hasTrackedCourseOpen.value = true;
      }
    }

    if (data.groups?.length && !expandedGroupUuid.value) {
      expandedGroupUuid.value = data.groups[0]?.uuid ?? null;
    }
    submittedQuizUuids.value.clear();
    if (data.quizzes) {
      for (const quiz of data.quizzes) {
        if (quiz.hasSubmitted) {
          submittedQuizUuids.value.add(quiz.uuid);
        }
      }
    }
    if (submitResult.value && activeQuiz.value) {
      submittedQuizUuids.value.add(activeQuiz.value.uuid);
    }
  } catch (err) {
    course.value = null;
  } finally {
    loading.value = false;
  }
}

async function refreshCourseFromStateEvent() {
  if (isRefreshingCourseState) {
    pendingCourseStateRefresh = true;
    return;
  }

  isRefreshingCourseState = true;
  try {
    do {
      pendingCourseStateRefresh = false;
      await loadCourse();
    } while (pendingCourseStateRefresh);
  } finally {
    isRefreshingCourseState = false;
  }
}

function faviconUrl(url?: string): string {
  if (!url) return '/Think-different-Academy_LOGO_oficialni_1.svg';
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=32`;
  } catch {
    return '/Think-different-Academy_LOGO_oficialni_1.svg';
  }
}

function fullUrl(path?: string) {
  if (!path) return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Uploads are served directly from /uploads, not /api/uploads
  // So we need to construct the full URL correctly
  const baseUrl = window.location.origin;
  return baseUrl + (path.startsWith("/") ? path : "/" + path);
}

async function trackAndOpen(eventType: 'material_download' | 'link_click', url: string, materialUuid?: string) {
  const id = route.params.uuid as string;
  try {
    await api(`/courses/${id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, materialUuid: materialUuid || null }),
    });
  } catch {
    // ignore tracking errors
  }
  // For file downloads, create a temporary link and click it to trigger download
  if (eventType === 'material_download') {
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function humanSize(bytes?: number) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

const QUIZ_DRAFT_KEY = (courseId: string, quizId: string) => `quiz-draft-${courseId}-${quizId}`;

function openQuiz(q: Quiz) {
  // Check if quiz can only be submitted once and user already submitted
  if (q.countOnlyLastAnswer && hasSubmittedQuiz(q.uuid)) {
    // Show result if available, otherwise just show message
    return;
  }
  
  activeQuiz.value = q;
  submitResult.value = null;
  const courseId = course.value?.uuid ?? '';
  const draft = sessionStorage.getItem(QUIZ_DRAFT_KEY(courseId, q.uuid));
  answers.value = {};

  q.questions.forEach((question) => {
    if (question.type === 'singleChoice') {
      answers.value[question.uuid] = { selectedIndex: undefined };
    } else {
      answers.value[question.uuid] = { selectedIndices: [] };
    }
  });

  if (draft) {
    try {
      const parsed = JSON.parse(draft) as Record<string, AnswerEntry>;
      q.questions.forEach((question) => {
        const restored = parsed[question.uuid];
        if (restored) {
          answers.value[question.uuid] = { ...answers.value[question.uuid], ...restored };
        }
      });
    } catch {
      // ignore invalid draft
    }
  }
}

function saveQuizDraft() {
  if (!activeQuiz.value || !course.value || submitResult.value) return;
  const key = QUIZ_DRAFT_KEY(course.value.uuid, activeQuiz.value.uuid);
  sessionStorage.setItem(key, JSON.stringify(answers.value));
}

function clearQuizDraft() {
  if (!activeQuiz.value || !course.value) return;
  sessionStorage.removeItem(QUIZ_DRAFT_KEY(course.value.uuid, activeQuiz.value.uuid));
}

function formatUserAnswer(q: Question, entry?: AnswerEntry): string {
  if (!entry) return '—';
  if (q.type === 'singleChoice' && typeof entry.selectedIndex === 'number' && q.options[entry.selectedIndex] != null) {
    return String(q.options[entry.selectedIndex]);
  }
  if (q.type === 'multipleChoice' && entry.selectedIndices?.length) {
    const txt = entry.selectedIndices
        .filter((i) => q.options[i] != null)
        .map((i) => String(q.options[i]))
        .join(', ');
    return txt || '—';
  }
  return '—';
}

function formatCorrectAnswer(q: Question): string {
  if (q.type === 'singleChoice' && typeof q.correctIndex === 'number' && q.options[q.correctIndex] != null) {
    return String(q.options[q.correctIndex]);
  }
  if (q.type === 'multipleChoice' && q.correctIndices?.length) {
    const txt = q.correctIndices
        .filter((i) => q.options[i] != null)
        .map((i) => String(q.options[i]))
        .join(', ');
    return txt || '—';
  }
  return '—';
}

function closeQuiz() {
  if (!submitResult.value) saveQuizDraft();
  activeQuiz.value = null;
  submitResult.value = null;
}

async function submitQuiz() {
  if (!activeQuiz.value) return;
  clearQuizDraft();
  const payload = {
    answers: activeQuiz.value.questions.map((q) => ({
      uuid: q.uuid,
      selectedIndex: answers.value[q.uuid]?.selectedIndex,
      selectedIndices: answers.value[q.uuid]?.selectedIndices,
    })),
  };
  try {
    const result = await api(`/courses/${course.value?.uuid}/quizzes/${activeQuiz.value.uuid}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    submitResult.value = result;
    if (activeQuiz.value) {
      submittedQuizUuids.value.add(activeQuiz.value.uuid);
    }
    await loadCourse();
  } catch (err: any) {
    if (err.error === "Tento kvíz lze vyplnit pouze jednou.") {
      alert("Už jste odpověděl");
    } else {
      alert("Nepodařilo se odeslat kvíz");
    }
  }
}

function stripMarkdownBold(text: string): string {
  return (text ?? '').replace(/\*\*/g, '');
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

let sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stateSseReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectSse() {
  const id = route.params.uuid as string;
  es?.close();
  es = new EventSource(`${API_BASE}/courses/${id}/feed/stream`);
  es.onmessage = (ev) => {
    try {
      const item: FeedItem = JSON.parse(ev.data);
      const existingIndex = feed.value.findIndex((f) => f.uuid === item.uuid);
      if (existingIndex >= 0) {
        // Update existing item
        feed.value[existingIndex] = item;
      } else {
        // Add new item
        feed.value = [item, ...feed.value];
      }
    } catch {
      // ignore
    }
  };
  es.onerror = () => {
    es?.close();
    es = null;
    if (!sseReconnectTimer) {
      sseReconnectTimer = setTimeout(() => {
        sseReconnectTimer = null;
        connectSse();
      }, 3000);
    }
  };
}

function connectStateSse() {
  const id = route.params.uuid as string;
  stateEs?.close();
  stateEs = new EventSource(`${API_BASE}/courses/${id}/state/stream`);
  stateEs.onmessage = async (ev) => {
    try {
      const event: CourseStateEvent = JSON.parse(ev.data);
      if (event.type === 'course-deleted') {
        course.value = null;
        loading.value = false;
        return;
      }
      if (event.type === 'course-state-changed' && event.state === 'paused') {
        router.replace(`/courses/${id}/paused`);
        return;
      }
      if (event.type === 'unlock' || event.type === 'refresh' || event.type === 'course-state-changed') {
        await refreshCourseFromStateEvent();
      }
    } catch {
      // ignore
    }
  };
  stateEs.onerror = () => {
    stateEs?.close();
    stateEs = null;
    if (!stateSseReconnectTimer) {
      stateSseReconnectTimer = setTimeout(() => {
        stateSseReconnectTimer = null;
        connectStateSse();
      }, 3000);
    }
  };
}

onMounted(() => {
  loadCourse();
  connectSse();
  connectStateSse();
});

onBeforeUnmount(() => {
  es?.close();
  stateEs?.close();
  if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
  if (stateSseReconnectTimer) clearTimeout(stateSseReconnectTimer);
  if (saveDraftTimeout) clearTimeout(saveDraftTimeout);
});

let saveDraftTimeout: ReturnType<typeof setTimeout> | null = null;
watch(answers, () => {
  if (saveDraftTimeout) clearTimeout(saveDraftTimeout);
  saveDraftTimeout = setTimeout(saveQuizDraft, 500);
}, { deep: true });
</script>

<style scoped>
.course-detail {
  max-width: 960px;
  margin: 40px auto;
  padding: 20px;
}
.content {
  background: var(--color-surface);
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--color-shadow);
  display: grid;
  gap: 24px;
  border: 1px solid var(--color-border);
}
.course-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
}
h1 { margin: 0 0 8px; color: var(--color-primary-dark); }
.description { font-size: 1.05rem; color: var(--color-text-muted); margin: 0 0 12px; }
.back-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 700;
}
.back-link:hover { text-decoration: underline; }

.section { display: grid; gap: 12px; }
.section-head h2 { margin: 0; color: var(--color-primary-dark); }
.subtext { margin: 4px 0 0; color: var(--color-text-muted); }

.group-list {
  display: grid;
  gap: 16px;
}

.group-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: rgba(145, 245, 173, 0.1);
  display: grid;
  gap: 12px;
}

.group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.group-head .group-title {
  flex: 1;
  margin: 0;
}

.group-head .group-desc {
  width: 100%;
  margin: 4px 0 0;
}

.group-head-clickable {
  cursor: pointer;
}

.group-head-clickable:hover {
  background: rgba(145, 245, 173, 0.08);
}

.group-head-locked {
  opacity: 0.7;
  cursor: not-allowed;
}

.group-head-locked:hover {
  background: transparent;
}

.group-toggle {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.section-subtitle {
  margin: 0 0 12px;
  font-size: 1.1rem;
  color: var(--color-primary-dark);
}

.group-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-primary-dark);
}

.group-desc {
  margin: 0;
  color: var(--color-text-muted);
}

.group-subtitle {
  margin: 0 0 8px;
  font-size: 1rem;
  color: var(--color-primary-dark);
}

.group-block {
  display: grid;
  gap: 10px;
}

.card-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.card-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
}
.card-row-green {
  background: rgba(255, 255, 255, 0.8);
}
.card-main { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.card-title { font-size: 1.05rem; color: var(--color-text); }
.card-desc { margin: 0; color: var(--color-text-muted); }
.card-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.link { color: var(--color-primary); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; }
.link:hover { text-decoration: underline; }
.link-with-favicon { gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.6); border-radius: 8px; border: 1px solid var(--color-border); }
.link-with-favicon:hover { background: rgba(255,255,255,0.9); }
.link-with-favicon .favicon { flex-shrink: 0; }
.link-with-favicon .link-text { display: flex; flex-direction: column; gap: 2px; }
.link-with-favicon .link-desc { font-size: 0.95rem; color: var(--color-text-muted); font-weight: 500; }
.link-with-favicon .link-label { font-weight: 700; color: var(--color-primary-dark); }
.meta { color: var(--color-text-muted); font-size: 0.95rem; }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.card-result { margin: 6px 0 0; color: var(--color-text); }
.card-top { display: flex; gap: 16px; align-items: center; font-size: 0.9rem; color: var(--color-text-muted); }
.badge { padding: 4px 8px; border-radius: 6px; text-transform: capitalize; }
.badge.manual { background: var(--color-accent-strong); color: var(--color-text); }
.badge.system { background: var(--color-teal); color: #fff; }
.timestamp { color: var(--color-text-muted); }
.edited { font-style: italic; color: var(--color-text-muted); }
.message { margin: 4px 0 0; color: var(--color-text); }

.quiz-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}

.quiz-player {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 20px var(--color-shadow);
  padding: 18px 20px;
}
.panel-head { display: flex; justify-content: space-between; align-items: center; }
.panel-body { display: flex; flex-direction: column; gap: 14px; }
.question { margin-bottom: 0; padding: 10px 12px; background: rgba(145, 245, 173, 0.15); border: 1px solid var(--color-border); border-radius: 8px; }
.q-title { font-weight: 600; color: var(--color-text); }
.form-actions { display: flex; gap: 12px; margin-top: 8px; }
.form-actions--submit { justify-content: flex-end; }
.options { display: grid; gap: 6px; }
.option { display: flex; gap: 8px; align-items: center; }
.btn-primary { background: var(--color-primary); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.btn-primary:hover { background: var(--color-primary-dark); }
.btn-ghost { background: transparent; border: 1px solid var(--color-border); padding: 8px 12px; border-radius: 8px; cursor: pointer; color: var(--color-primary-dark); }
.btn-ghost:hover { background: rgba(145, 245, 173, 0.18); }
.result-panel { display: grid; gap: 16px; }
.result-summary { padding: 12px; background: rgba(145, 245, 173, 0.2); border: 1px solid var(--color-border); border-radius: 8px; }
.result-score { margin: 0 0 4px; font-weight: 800; color: var(--color-primary-dark); }
.question-feedback { display: grid; gap: 12px; }
.feedback-item { padding: 12px; border-radius: 8px; border: 1px solid var(--color-border); }
.feedback-item.correct { background: rgba(145, 245, 173, 0.25); border-color: rgba(109, 212, 177, 0.5); }
.feedback-item.wrong { background: rgba(255, 200, 200, 0.2); border-color: rgba(200, 100, 100, 0.4); }
.feedback-item .q-title { margin: 0 0 8px; }
.feedback-item .user-answer, .feedback-item .correct-answer { margin: 4px 0; font-size: 0.95rem; }

.loading, .not-found { text-align: center; padding: 60px; }

@media (max-width: 720px) {
  .course-header { flex-direction: column; }
  .card-row { flex-direction: column; }
}
</style>

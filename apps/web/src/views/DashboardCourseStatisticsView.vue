<template>
  <DashboardLayout :name="course ? `${course.name} — Statistiky` : 'Statistiky kurzu'">
    <div class="statistics-container">
      <div class="form-actions-top">
        <router-link :to="`/dashboard/courses/${routeUuid}/edit`" class="btn-cancel">Zpět</router-link>
      </div>

      <div v-if="loading" class="loading">Načítání…</div>
      <div v-else-if="!course" class="not-found">Kurz nenalezen.</div>

      <template v-else>
        <section class="section">
          <h2>Statistiky kurzu</h2>
          <div class="analytics-stats">
            <p><strong>Otevření kurzu:</strong> {{ courseAnalytics.courseOpens }}</p>
            <div class="analytics-subsection">
              <p><strong>Dokončení kvízů podle uživatele:</strong></p>
              <ul v-if="courseAnalytics.quizCompletionByUser?.length" class="analytics-user-list">
                <li
                  v-for="userStat in courseAnalytics.quizCompletionByUser"
                  :key="userStat.userId ?? userStat.participantName"
                >
                  {{ userStat.participantName }} — {{ userStat.completionPercent }} %
                  <span class="muted small">({{ userStat.completedQuizzes }}/{{ userStat.totalQuizzes }} kvízů)</span>
                </li>
              </ul>
              <p v-else class="muted small">Zatím žádné kvízové pokusy.</p>
            </div>
          </div>
        </section>

        <section class="section">
        <h2>Statistiky materiálů a kvízů</h2>
        <p class="muted">Přehled všech materiálů a kvízů v kurzu včetně statistik.</p>

        <div v-if="flatItems.length === 0" class="empty">Kurz zatím nemá žádné materiály ani kvízy.</div>

        <ul v-else class="stats-flat-list">
          <li
            v-for="item in flatItems"
            :key="`${item.type}-${item.uuid}`"
            class="stats-row"
          >
            <div class="stats-row-main">
              <span class="stats-group-name">{{ item.groupName }}</span>
              <span class="stats-title">{{ item.type === 'material' ? item.name : item.title }}</span>
            </div>
            <div class="stats-row-meta">
              <template v-if="item.type === 'material'">
                <span class="stat-value">
                  {{ item.materialType === 'file' ? 'Stažení' : 'Kliknutí' }}: {{ item.materialType === 'file' ? materialStat(item.uuid).downloads : materialStat(item.uuid).linkClicks }}
                </span>
              </template>
              <template v-else>
                <span class="stat-value">Pokusy: {{ item.attemptsCount ?? 0 }}</span>
                <button type="button" class="btn-ghost" @click="openQuizStats(item)">Výsledky</button>
              </template>
            </div>
          </li>
        </ul>
        </section>
      </template>
    </div>

    <!-- Quiz stats overlay (same behavior as dashboard) -->
    <div v-if="showQuizStats" class="feed-form-overlay" role="dialog" aria-modal="true">
      <div class="panel quiz-stats-panel">
        <header class="panel-head">
          <div>
            <h3>{{ quizStats?.title ?? 'Výsledky kvízu' }}</h3>
            <p class="subtext">
              Celkem pokusů: {{ quizStats?.totalAttempts ?? 0 }} · Účastníci: {{ quizStats?.participantsCount ?? quizStats?.participants?.total ?? 0 }}
            </p>
            <p v-if="quizStats?.participants?.names?.length" class="participants-names">
              {{ quizStats.participants.names.join(', ') }}
            </p>
          </div>
          <button class="btn-ghost" type="button" @click="closeQuizStats">Zavřít</button>
        </header>
        <div class="panel-body">
          <div v-if="quizStatsLoading" class="muted">Načítání…</div>
          <div v-else-if="quizStats?.questionStats?.length" class="stats-list">
            <div class="stats-actions">
              <button v-if="!showParticipantAnswers" class="btn-ghost" type="button" @click="loadParticipantAnswers(currentQuizUuid!)">
                Zobrazit odpovědi účastníků
              </button>
              <button v-else class="btn-ghost" type="button" @click="showParticipantAnswers = false">
                Skrýt odpovědi účastníků
              </button>
            </div>
            <div v-for="(s, idx) in quizStats.questionStats" :key="s.questionUuid" class="stat-row">
              <span class="stat-q">{{ Number(idx) + 1 }}. {{ s.question }}</span>
              <span class="stat-pct">{{ s.percentCorrect }}%</span>
              <span class="stat-count">({{ s.correctCount }} / {{ s.totalAttempts }})</span>
              <div class="option-distribution" v-if="s.optionDistribution?.length">
                <div v-for="opt in s.optionDistribution" :key="opt.option" class="option-row">
                  <span class="opt-label">{{ opt.option }}</span>
                  <div class="opt-bar-track">
                    <div class="opt-bar-fill" :style="{ width: String(opt.percent) + '%' }"></div>
                  </div>
                  <span class="opt-percent">{{ opt.percent }}% ({{ opt.count }})</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="muted">Zatím žádné odpovědi.</div>
          <div v-if="showParticipantAnswers" class="participant-answers-section">
            <h4>Odpovědi účastníků</h4>
            <div v-if="participantAnswersLoading" class="muted">Načítání…</div>
            <div v-else-if="participantAnswers?.participants?.length" class="participant-answers-list">
              <div
                v-for="participant in participantAnswers.participants"
                :key="participant.participantName"
                class="participant-group"
              >
                <div class="participant-header">
                  <strong>{{ participant.participantName }} - Počet pokusů: {{ participant.totalAttempts }}</strong>
                </div>
                <div v-for="attempt in participant.attempts" :key="attempt.attemptUuid" class="participant-attempt">
                  <div class="attempt-header">
                    <span class="attempt-score">{{ attempt.score }} / {{ attempt.maxScore }}</span>
                    <span class="attempt-date">{{ formatDate(attempt.createdAt) }}</span>
                  </div>
                  <div class="attempt-answers">
                    <div v-for="(answer, idx) in attempt.answers" :key="answer.questionUuid" class="answer-item">
                      <div class="answer-question">
                        {{ Number(idx) + 1 }}. {{ participantAnswers?.questions.find((q: { uuid: string }) => q.uuid === answer.questionUuid)?.question || 'Otázka' }}
                      </div>
                      <div class="answer-selection" :class="{ correct: answer.correct, incorrect: !answer.correct }">
                        <span v-if="answer.selectedIndex !== null">
                          {{ participantAnswers?.questions.find((q: { uuid: string; options?: string[] }) => q.uuid === answer.questionUuid)?.options[Number(answer.selectedIndex)] || `Možnost ${Number(answer.selectedIndex) + 1}` }}
                        </span>
                        <span v-else-if="answer.selectedIndices && answer.selectedIndices.length > 0">
                          {{ answer.selectedIndices.map((i: number) => participantAnswers?.questions.find((q: { uuid: string; options?: string[] }) => q.uuid === answer.questionUuid)?.options[Number(i)] || `Možnost ${Number(i) + 1}`).join(', ') }}
                        </span>
                        <span v-else>Bez odpovědi</span>
                        <span class="answer-status">{{ answer.correct ? '✓ Správně' : '✗ Špatně' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="muted">Žádné odpovědi.</div>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import DashboardLayout from '../components/DashboardLayout.vue';
import { api } from '../services/api';

const route = useRoute();
const routeUuid = String(route.params.uuid || '');

const course = ref<any | null>(null);
const groups = ref<any[]>([]);
const materials = ref<any[]>([]);
const quizzes = ref<any[]>([]);
const loading = ref(true);

const courseAnalytics = ref<{
  courseOpens: number;
  materialStats?: Record<string, { downloads: number; linkClicks: number }>;
  quizCompletionByUser?: Array<{
    userId: number | null;
    participantName: string;
    completedQuizzes: number;
    totalQuizzes: number;
    completionPercent: number;
  }>;
}>({
  courseOpens: 0,
});

const flatItems = computed(() => {
  const items: Array<{ type: 'material' | 'quiz'; groupName: string; uuid: string; name?: string; title?: string; attemptsCount?: number; materialType?: string }> = [];

  for (const g of groups.value) {
    const groupName = g.title || 'Nezařazené';
    for (const m of (g.materials || [])) {
      items.push({ type: 'material', groupName, uuid: m.uuid, name: m.name, materialType: m.type });
    }
    for (const q of (g.quizzes || [])) {
      items.push({
        type: 'quiz',
        groupName,
        uuid: q.uuid,
        title: q.title,
        attemptsCount: q.attemptsCount,
      });
    }
  }
  const ungroupedGroup = groups.value.find(gg => gg.title === 'Nezařazené');
  const ungroupedName = ungroupedGroup ? 'Nezařazené' : '—';
  for (const m of materials.value.filter(m => !m.moduleUuid)) {
    items.push({ type: 'material', groupName: ungroupedName, uuid: m.uuid, name: m.name, materialType: m.type });
  }
  for (const q of quizzes.value.filter(q => !q.moduleUuid)) {
    items.push({
      type: 'quiz',
      groupName: ungroupedName,
      uuid: q.uuid,
      title: q.title,
      attemptsCount: q.attemptsCount,
    });
  }
  return items;
});

function materialStat(materialUuid: string): { downloads: number; linkClicks: number } {
  const s = courseAnalytics.value.materialStats?.[materialUuid];
  return { downloads: s?.downloads ?? 0, linkClicks: s?.linkClicks ?? 0 };
}

const showQuizStats = ref(false);
const currentQuizUuid = ref<string | null>(null);
const quizStats = ref<any>(null);
const quizStatsLoading = ref(false);
const showParticipantAnswers = ref(false);
const participantAnswers = ref<any>(null);
const participantAnswersLoading = ref(false);

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

async function openQuizStats(quiz: { uuid: string }) {
  showQuizStats.value = true;
  currentQuizUuid.value = quiz.uuid;
  quizStats.value = null;
  quizStatsLoading.value = true;
  try {
    quizStats.value = await api(`/dashboard/courses/${routeUuid}/quizzes/${quiz.uuid}/stats`);
  } catch {
    quizStats.value = null;
  } finally {
    quizStatsLoading.value = false;
  }
}

function closeQuizStats() {
  showQuizStats.value = false;
  currentQuizUuid.value = null;
  quizStats.value = null;
  showParticipantAnswers.value = false;
  participantAnswers.value = null;
}

async function loadParticipantAnswers(quizUuid: string) {
  showParticipantAnswers.value = true;
  participantAnswers.value = null;
  participantAnswersLoading.value = true;
  try {
    participantAnswers.value = await api(`/dashboard/courses/${routeUuid}/quizzes/${quizUuid}/participant-answers`);
  } catch {
    participantAnswers.value = null;
  } finally {
    participantAnswersLoading.value = false;
  }
}

async function loadCourse(showLoading = true) {
  if (showLoading) {
    loading.value = true;
  }
  try {
    const raw = await api<{ groups?: any[]; materials?: any[]; quizzes?: any[] }>(`/dashboard/courses/${routeUuid}`);
    course.value = raw;
    groups.value = raw?.groups ?? [];
    materials.value = raw?.materials ?? [];
    quizzes.value = raw?.quizzes ?? [];
    try {
      const stats = await api<{
        courseOpens?: number;
        materialStats?: Record<string, { downloads: number; linkClicks: number }>;
        quizCompletionByUser?: Array<{
          userId: number | null;
          participantName: string;
          completedQuizzes: number;
          totalQuizzes: number;
          completionPercent: number;
        }>;
      }>(`/dashboard/courses/${routeUuid}/analytics`);
      courseAnalytics.value = {
        courseOpens: stats?.courseOpens ?? 0,
        materialStats: stats?.materialStats,
        quizCompletionByUser: stats?.quizCompletionByUser,
      };
    } catch {
      // ignore
    }
  } catch {
    course.value = null;
    groups.value = [];
    materials.value = [];
    quizzes.value = [];
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadCourse(true);
  refreshInterval = setInterval(() => {
    if (!showQuizStats.value) loadCourse(false);
  }, 5000);
});

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
});
</script>

<style scoped>
.statistics-container { padding: 12px; }
.form-actions-top { display: flex; gap: 12px; margin-bottom: 20px; }
.btn-cancel { padding: 8px 14px; border-radius: 8px; text-decoration: none; color: var(--color-text); border: 1px solid var(--color-border); }
.btn-cancel:hover { background: rgba(0,0,0,0.05); }
.loading, .not-found, .empty { padding: 24px; color: var(--color-text-muted); }
.section { margin-top: 16px; }
.section h2 { margin: 0 0 8px; color: var(--color-primary-dark); }
.muted { color: var(--color-text-muted); margin: 0 0 16px; }
.muted.small { font-size: 0.9rem; }
.analytics-stats { padding: 16px; border-radius: 12px; border: 1px solid var(--color-border); background: var(--color-surface); }
.analytics-stats p { margin: 8px 0; }
.analytics-subsection { margin-top: 10px; }
.analytics-user-list { list-style: none; padding: 0; margin: 6px 0 0; display: grid; gap: 4px; font-size: 0.95rem; }
.stats-flat-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.stats-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); }
.stats-row-main { display: flex; align-items: baseline; gap: 10px; flex: 1; min-width: 0; }
.stats-group-name { font-size: 0.9rem; color: var(--color-text-muted); }
.stats-title { font-weight: 600; color: var(--color-text); }
.stats-row-meta { display: flex; align-items: center; gap: 12px; }
.stat-value { font-size: 0.95rem; color: var(--color-text-muted); }
.btn-ghost { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--color-border); background: transparent; cursor: pointer; color: var(--color-primary-dark); }
.btn-ghost:hover { background: rgba(0,0,0,0.05); }
.feed-form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.panel { background: #fff; border-radius: 12px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
.quiz-stats-panel { width: min(800px, 95vw); }
.panel-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
.panel-body { padding: 20px; overflow-y: auto; }
.stats-list { display: grid; gap: 12px; }
.stats-actions { margin-bottom: 12px; }
.stat-row { display: grid; gap: 4px; }
.stat-q, .stat-pct, .stat-count { font-size: 0.95rem; }
.option-distribution { margin-top: 8px; margin-left: 12px; }
.option-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
.opt-label { min-width: 120px; }
.opt-bar-track { flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.opt-bar-fill { height: 100%; background: var(--color-primary); }
.opt-percent { font-size: 0.85rem; color: var(--color-text-muted); }
.participant-answers-section { margin-top: 20px; }
.participant-group { margin-bottom: 16px; }
.participant-header { margin-bottom: 8px; }
.attempt-header { margin: 8px 0 4px; font-size: 0.9rem; }
.answer-item { margin: 8px 0; padding: 8px; background: #f8f8f8; border-radius: 6px; }
.answer-selection.correct { color: green; }
.answer-selection.incorrect { color: #c00; }
.answer-status { margin-left: 8px; }
</style>

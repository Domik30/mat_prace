<template>
  <DashboardLayout :name="isEdit ? 'Upravit kurz' : 'Vytvořit kurz'">
    <div class="course-form">
      <div>
        <div class="form-actions-top">
          <router-link to="/dashboard" class="btn-cancel">Zpět</router-link>
          <router-link v-if="isEdit" :to="`/dashboard/courses/${courseId}/statistics`" class="btn-cancel">Statistiky</router-link>
          <button v-if="isEdit" type="button" class="btn-cancel" @click="duplicateCourse">Duplikovat kurz</button>
        </div>
        <form @submit.prevent="handleCourseSubmit">
          <div class="form-row">
            <div class="field">
              <label for="name">Název kurzu</label>
              <input id="name" v-model="form.name" type="text" required :readonly="isReadOnly" />
            </div>
            <div class="field">
              <label for="description">Popis</label>
              <input id="description" v-model="form.description" type="text" required :readonly="isReadOnly" />
            </div>
          </div>
          <template v-if="isEdit">
            <div class="form-row">
              <div class="field">
                <label for="course-state">Stav kurzu</label>
                <select id="course-state" v-model="courseState" :disabled="!canChangeState" @change="saveCourseState">
                  <option v-for="opt in allowedNextStates" :key="opt" :value="opt">
                    {{ opt === 'draft' ? 'Koncept (lze upravovat)' : opt === 'scheduled' ? 'Naplánováno' : opt === 'live' ? 'Živý' : opt === 'paused' ? 'Pozastaveno' : 'Archivováno' }}
                  </option>
                </select>
              </div>
              <div v-if="courseState === 'scheduled'" class="field">
                <label for="live-at">Datum a čas zveřejnění (přechod do živého)</label>
                <input id="live-at" v-model="courseLiveAt" type="datetime-local" @change="saveCourseLiveAt" />
              </div>
            </div>
          </template>
          <div v-if="!isEdit" class="form-actions form-actions--end" style="margin-top: 16px;">
            <button type="submit" class="btn-save">Vytvořit kurz</button>
          </div>
        </form>
      </div>

      <!-- Groups -->
      <section v-if="isEdit" class="section" :class="{ 'readonly-mode': isReadOnly }" @dragover.prevent="isDraft && $event.preventDefault()" @drop.prevent="isDraft && onDropOnGroup(null)">
        <header class="section-head">
          <h3>Skupiny</h3>
          <button
              v-if="isDraft"
              class="btn-add"
              type="button"
              @click.stop="openGroupForm()"
              @pointerdown.stop
          >
            Přidat skupinu
          </button>
        </header>
        <div v-if="groups.length === 0" class="empty">Zatím žádné skupiny. Můžete je přidat pro seskupení materiálů, kvízů a oznámení.</div>
        <PaginatedList v-else :items="groups" :page-size="5">
          <template #default="{ items: paginatedGroups }">
        <div class="quiz-list">
          <div
              v-for="group in paginatedGroups"
              :key="group.uuid"
              class="quiz-row group-row"
              :draggable="isDraft"
              @dragstart="isDraft && onGroupDragStart($event, group)"
              @dragover.prevent="isDraft && onGroupDragover($event)"
              @drop.prevent="isDraft && onGroupDropOrItemDrop($event, group)"
          >
            <div class="group-row-head">
              <div v-if="isDraft" class="group-controls-indent">
                <div class="group-move-buttons">
                  <button
                      type="button"
                      class="group-move-btn"
                      title="Posunout nahoru"
                      :disabled="!canMoveGroupUp(group)"
                      @click="moveGroupUp(group)"
                  >
                    ↑
                  </button>
                  <button
                      type="button"
                      class="group-move-btn"
                      title="Posunout dolů"
                      :disabled="!canMoveGroupDown(group)"
                      @click="moveGroupDown(group)"
                  >
                    ↓
                  </button>
                </div>
                <button
                    type="button"
                    class="group-toggle-btn"
                    @click="toggleDashboardGroup(group.uuid)"
                    :aria-expanded="expandedDashboardGroupUuid === group.uuid"
                >
                  {{ expandedDashboardGroupUuid === group.uuid ? '▼' : '▶' }}
                </button>
              </div>
              <button
                  v-else
                  type="button"
                  class="group-toggle-btn"
                  @click="toggleDashboardGroup(group.uuid)"
                  :aria-expanded="expandedDashboardGroupUuid === group.uuid"
              >
                {{ expandedDashboardGroupUuid === group.uuid ? '▼' : '▶' }}
              </button>
              <div class="group-info">
                <strong>{{ group.title }}</strong>
                <span class="muted"> — {{ group.isUnlocked ? 'Otevřeno' : 'Zavřeno' }}</span>
                <span v-if="group.description" class="muted"> — {{ group.description }}</span>
                <span v-if="group.scheduledUnlockAt" class="muted"> (uvolnění: {{ formatScheduledUnlock(group.scheduledUnlockAt) }})</span>
              </div>
              <div class="row-actions">
                <template v-if="canToggleGroupUnlock">
                  <button class="btn-ghost" type="button" @click="toggleGroupUnlock(group)">{{ group.isUnlocked ? 'Zavřít' : 'Otevřít' }}</button>
                </template>
                <template v-if="isDraft">
                  <button class="btn-ghost" type="button" @click="openScheduledUnlockDialog(group)">Naplánovat uvolnění</button>
                  <button v-if="group.title !== 'Nezařazené'" class="btn-ghost" type="button" @click="openGroupForm(group)">Upravit</button>
                  <button v-if="group.title !== 'Nezařazené'" class="btn-delete" type="button" @click="deleteGroup(group)">Smazat</button>
                </template>
              </div>
            </div>

            <div v-show="expandedDashboardGroupUuid === group.uuid" class="group-body" @dragover="(e) => { if (isDraft) e.preventDefault(); }" @drop.prevent="isDraft && onDropOnGroupBody($event, group)">
              <div v-if="isDraft" class="group-actions">
                <button class="btn-add-small" type="button" @click="startCreateMaterialForGroup(group.uuid)">+ Materiál</button>
                <button class="btn-add-small" type="button" @click="startCreateQuizForGroup(group.uuid)">+ Kvíz</button>
                <button class="btn-add-small" type="button" @click="startCreateFeedForGroup(group.uuid)">+ Oznámení</button>
              </div>
              
              <div v-if="(group.feed ?? groupFeed(group.uuid)).length" class="group-items">
                <p class="group-label">Oznámení</p>
                <ul class="group-item-list">
                  <li
                      v-for="item in (group.feed ?? groupFeed(group.uuid))"
                      :key="item.uuid"
                      class="group-item"
                      :draggable="isDraft"
                      @dragstart="isDraft && onDragStart('feed', item.uuid, item.moduleUuid ?? null, $event)"
                  >
                    <div class="group-item-main group-item-main--centered">
                      <span class="item-name">{{ feedPreview(item.message) }}</span>
                      <span class="item-meta">{{ formatDate(item.createdAt) }}</span>
                    </div>
                    <div v-if="isDraft" class="group-item-actions">
                      <button class="btn-ghost" type="button" @click="editFeed(item)">Upravit</button>
                      <button class="btn-ghost" type="button" @click="openGroupPicker('feed', item.uuid)">
                        Změnit skupinu
                      </button>
                      <button class="btn-delete" type="button" @click="removeFeed(item)">Smazat</button>
                    </div>
                  </li>
                </ul>
              </div>

              <div v-if="(group.materials ?? groupMaterials(group.uuid)).length" class="group-items">
                <p class="group-label">Materiály</p>
                <ul class="group-item-list">
                  <li
                      v-for="item in (group.materials ?? groupMaterials(group.uuid))"
                      :key="item.uuid"
                      class="group-item"
                      :draggable="isDraft"
                      @dragstart="isDraft && onDragStart('material', item.uuid, item.moduleUuid ?? null, $event)"
                  >
                    <div class="group-item-main group-item-main--centered">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-meta">{{ item.type === 'file' ? 'Soubor' : 'Odkaz' }}</span>
                    </div>
                    <div v-if="isDraft" class="group-item-actions">
                      <button class="btn-ghost" type="button" @click="startEditMaterial(item)">Upravit</button>
                      <button class="btn-ghost" type="button" @click="openGroupPicker('material', item.uuid)">
                        Změnit skupinu
                      </button>
                      <button class="btn-delete" type="button" @click="deleteMaterial(item)">Smazat</button>
                    </div>
                  </li>
                </ul>
              </div>

              <div v-if="(group.quizzes ?? groupQuizzes(group.uuid)).length" class="group-items">
                <p class="group-label">Kvízy</p>
                <ul class="group-item-list">
                  <li
                      v-for="quiz in (group.quizzes ?? groupQuizzes(group.uuid))"
                      :key="quiz.uuid"
                      class="group-item"
                      :draggable="isDraft"
                      @dragstart="isDraft && onDragStart('quiz', quiz.uuid, quiz.moduleUuid ?? null, $event)"
                  >
                    <div class="group-item-main group-item-main--centered">
                      <span class="item-name">{{ quiz.title }}</span>
                    </div>
                    <div class="group-item-actions">
                      <button v-if="isDraft" class="btn-ghost" type="button" @click="editQuiz(quiz)">Upravit</button>
                      <button v-if="isDraft" class="btn-ghost" type="button" @click="openGroupPicker('quiz', quiz.uuid)">
                        Změnit skupinu
                      </button>
                      <button v-if="isDraft" class="btn-delete" type="button" @click="deleteQuiz(quiz)">Smazat</button>
                    </div>
                  </li>
                </ul>
              </div>

              <p v-if="!(group.feed ?? groupFeed(group.uuid)).length && !(group.materials ?? groupMaterials(group.uuid)).length && !(group.quizzes ?? groupQuizzes(group.uuid)).length" class="muted">
                Zatím žádný obsah v této skupině.
              </p>
            </div>
          </div>
        </div>
          </template>
        </PaginatedList>
      </section>

      <!-- Material Preset Selector -->
      <div v-if="showMaterialPresetSelector" class="feed-form-overlay" role="dialog" aria-modal="true">
        <div class="panel feed-form">
          <header class="panel-head">
            <h3>Vyberte předvolbu materiálu</h3>
            <button class="btn-ghost" type="button" @click="showMaterialPresetSelector = false">Zavřít</button>
          </header>
          <div class="panel-body">
            <div class="preset-list">
              <button
                  v-for="preset in materialPresets"
                  :key="preset.uuid"
                  class="preset-item"
                  @click="useMaterialPreset(preset)"
              >
                <strong>{{ preset.name }}</strong>
                <span class="preset-type">{{ preset.type === 'file' ? 'Soubor' : 'Odkaz' }}</span>
                <span v-if="preset.description" class="preset-desc">{{ preset.description }}</span>
              </button>
            </div>
            <div class="form-actions form-actions--end">
              <button class="btn-primary" type="button" @click="createMaterialFromScratch">Vytvořit nový</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Materials Form (shown when creating/editing) -->
      <DashboardMaterialForm
          v-if="showMaterialForm"
          :mode="materialFormMode"
          :initial="editingMaterial"
          :courseId="courseId"
          :modules="groups"
          :defaultGroupUuid="materialGroupUuid"
          @saved="onMaterialSaved"
          @cancel="onCancelMaterial"
      />

      <!-- Quiz Preset Selector -->
      <div v-if="showQuizPresetSelector" class="feed-form-overlay" role="dialog" aria-modal="true">
        <div class="panel feed-form">
          <header class="panel-head">
            <h3>Vyberte předvolbu kvízu</h3>
            <button class="btn-ghost" type="button" @click="showQuizPresetSelector = false">Zavřít</button>
          </header>
          <div class="panel-body">
            <div class="preset-list">
              <button
                  v-for="preset in quizPresets"
                  :key="preset.uuid"
                  class="preset-item"
                  @click="useQuizPreset(preset)"
              >
                <strong>{{ preset.name }}</strong>
                <span class="preset-title">{{ preset.title }}</span>
                <span class="preset-meta">{{ preset.questions?.length || 0 }} otázek</span>
              </button>
            </div>
            <div class="form-actions form-actions--end">
              <button class="btn-primary" type="button" @click="createQuizFromScratch">Vytvořit nový</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quiz Form (shown when creating/editing) -->
      <div v-if="showQuizForm" class="quiz-form-overlay" role="dialog" aria-modal="true">
        <div class="panel quiz-form-panel">
          <header class="panel-head">
            <h3>{{ quizForm.uuid ? 'Upravit kvíz' : 'Vytvořit kvíz' }}</h3>
            <button class="btn-ghost" type="button" @click="cancelQuiz">Zavřít</button>
          </header>
          <div class="panel-body">
            <div class="field">
              <label>Název kvízu</label>
              <input v-model="quizForm.title" required />
            </div>
            <div class="field">
              <label>
                <input type="checkbox" v-model="quizForm.countOnlyLastAnswer" />
                Povolit vyplnění pouze jednou
              </label>
            </div>

            <div class="questions">
              <div
                  v-for="(q, idx) in quizForm.questions"
                  :key="q.uuid"
                  class="question-card"
              >
                <div class="question-top">
                  <strong>{{ idx + 1 }}. otázka</strong>
                  <button class="btn-ghost" type="button" @click="removeQuestion(idx)">Odstranit</button>
                </div>
                <div class="field">
                  <label>Typ</label>
                  <select v-model="q.type">
                    <option value="singleChoice">Jedna odpověď</option>
                    <option value="multipleChoice">Více odpovědí</option>
                  </select>
                </div>
                <div class="field">
                  <label>Otázka</label>
                  <input v-model="q.question" />
                </div>
                <div class="field">
                  <label>Možnosti (jedna na řádek)</label>
                  <textarea v-model="q.optionsText" rows="3"></textarea>
                </div>
                <div class="field correct-options" v-if="parsedOptions(q).length">
                  <label v-if="q.type === 'singleChoice'">Označte správnou odpověď</label>
                  <label v-else>Označte správné odpovědi</label>
                  <div class="correct-options-list">
                    <label v-for="(opt, i) in parsedOptions(q)" :key="i" class="correct-option">
                      <input v-if="q.type === 'singleChoice'" type="radio" :name="`correct-${q.uuid}`" :value="i" v-model.number="q.correctIndex" />
                      <input v-else type="checkbox" :value="i" v-model="q.correctIndices" />
                      <span>{{ opt }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn-ghost" type="button" @click="addQuestion">+ Přidat otázku</button>

            <div class="form-actions form-actions--end">
              <button class="btn-save" type="button" @click="saveQuiz">Uložit kvíz</button>
              <button class="btn-cancel" type="button" @click="cancelQuiz">Zrušit</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Feed Preset Selector -->
      <div v-if="showFeedPresetSelector" class="feed-form-overlay" role="dialog" aria-modal="true">
        <div class="panel feed-form">
          <header class="panel-head">
            <h3>Vyberte předvolbu oznámení</h3>
            <button class="btn-ghost" type="button" @click="showFeedPresetSelector = false">Zavřít</button>
          </header>
          <div class="panel-body">
            <div class="preset-list">
              <button
                  v-for="preset in feedPresets"
                  :key="preset.uuid"
                  class="preset-item"
                  @click="useFeedPreset(preset)"
              >
                <strong>{{ preset.name }}</strong>
                <span class="preset-message">{{ preset.message.substring(0, 100) }}{{ preset.message.length > 100 ? '...' : '' }}</span>
              </button>
            </div>
            <div class="form-actions form-actions--end">
              <button class="btn-primary" type="button" @click="createFeedFromScratch">Vytvořit nový</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Feed Form (shown when creating/editing) -->
      <div v-if="showFeedForm" class="feed-form-overlay" role="dialog" aria-modal="true">
        <div class="panel feed-form">
          <header class="panel-head">
            <div>
              <h3>{{ feedForm.uuid ? 'Upravit příspěvek' : 'Přidat příspěvek' }}</h3>
              <p class="subtext">Sdílejte aktualizaci nebo oznámení se studenty.</p>
            </div>
          </header>

          <div class="panel-body">
            <div class="field">
              <label>Zpráva</label>
              <textarea v-model="feedForm.message" rows="3" placeholder="Nové oznámení…" required></textarea>
            </div>
            <div class="form-actions form-actions--end">
              <button class="btn-save" type="button" @click="submitFeedForm">{{ feedForm.uuid ? 'Uložit' : 'Odeslat' }}</button>
              <button class="btn-cancel" type="button" @click="cancelFeedForm">Zrušit</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Group overlay form -->
      <div v-if="showGroupForm" class="feed-form-overlay" role="dialog" aria-modal="true">
        <div class="panel feed-form">
          <header class="panel-head">
            <div>
              <h3>{{ editingGroup ? 'Upravit skupinu' : 'Přidat skupinu' }}</h3>
              <p class="subtext">Seskupte materiály, kvízy a oznámení do logických celků.</p>
            </div>
          </header>

          <div class="panel-body">
            <div class="field">
              <label>Název</label>
              <input v-model="groupForm.title" type="text" required />
            </div>
            <div class="field">
              <label>Popis (volitelné)</label>
              <input v-model="groupForm.description" type="text" />
            </div>
            <div v-if="editingGroup" class="field">
              <label>Naplánované uvolnění (datum a čas)</label>
              <input v-model="groupForm.scheduledUnlockAt" type="datetime-local" />
              <p class="muted small">Nechte prázdné pro manuální odemčení. Po nastavení se skupina automaticky odemkne v daný čas.</p>
            </div>
            <div class="form-actions form-actions--end">
              <button class="btn-save" type="button" @click="saveGroup">{{ editingGroup ? 'Uložit' : 'Vytvořit' }}</button>
              <button class="btn-cancel" type="button" @click="closeGroupForm">Zrušit</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feed overlay form -->
    <div v-if="showFeedForm" class="feed-form-overlay" role="dialog" aria-modal="true">
      <div class="panel feed-form">
        <header class="panel-head">
          <div>
            <h3>{{ feedForm.uuid ? 'Upravit příspěvek' : 'Přidat příspěvek' }}</h3>
            <p class="subtext">Sdílejte aktualizaci nebo oznámení se studenty.</p>
          </div>
        </header>

        <div class="panel-body">
          <div class="field">
            <label>Zpráva</label>
            <textarea v-model="feedForm.message" rows="3" placeholder="Nové oznámení…" required></textarea>
          </div>
          <div class="form-actions form-actions--end">
            <button class="btn-save" type="button" @click="submitFeedForm">{{ feedForm.uuid ? 'Uložit' : 'Odeslat' }}</button>
            <button class="btn-cancel" type="button" @click="cancelFeedForm">Zrušit</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Group picker overlay for single item -->
    <div v-if="groupPicker" class="feed-form-overlay" role="dialog" aria-modal="true">
      <div class="panel feed-form">
        <header class="panel-head">
          <div>
            <h3>Změnit skupinu</h3>
            <p class="subtext">Vyberte skupinu, do které chcete položku přesunout.</p>
          </div>
        </header>
        <div class="panel-body">
          <div class="field">
            <label>Skupina</label>
            <select v-model="selectedGroupForPicker">
              <option :value="''">Nezařazené</option>
              <option v-for="group in groups" :key="group.uuid" :value="group.uuid">
                {{ group.title }}
              </option>
            </select>
          </div>
          <div class="form-actions form-actions--end">
            <button class="btn-save" type="button" @click="applyGroupSelection(selectedGroupForPicker || null)">
              Uložit
            </button>
            <button class="btn-cancel" type="button" @click="groupPicker = null">Zrušit</button>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import DashboardLayout from '../components/DashboardLayout.vue';
import DashboardMaterialForm, { type MaterialEditData } from '../components/DashboardMaterialForm.vue';
import PaginatedList from '../components/PaginatedList.vue';
import { api } from '../services/api';
import type { Material } from '../components/DashboardMaterialItem.vue';

type QuizQuestionForm = {
  uuid: string;
  type: 'singleChoice' | 'multipleChoice';
  question: string;
  optionsText: string;
  correctIndex?: number;
  correctIndices?: number[];
};

type QuizForm = {
  uuid?: string;
  title: string;
  questions: QuizQuestionForm[];
  countOnlyLastAnswer?: boolean;
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

type CourseQuiz = {
  uuid: string;
  title: string;
  attemptsCount?: number;
  questions?: any[];
  moduleUuid?: string | null;
  countOnlyLastAnswer?: boolean;
};

interface CourseResponse {
  uuid: string;
  name: string;
  description: string;
  isPublished?: boolean;
  state?: string;
  liveAt?: string | null;
  materials?: Material[];
  quizzes?: CourseQuiz[];
  feed?: FeedItem[];
}

type ModuleDto = {
  uuid: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isUnlocked: boolean;
  scheduledUnlockAt?: string | null;
  materials?: Material[];
  quizzes?: CourseQuiz[];
  feed?: FeedItem[];
};

type MaterialWithGroup = Material & { moduleUuid?: string | null };

const route = useRoute();
const router = useRouter();

const courseId = computed<string>(() => {
  const id = route.params.uuid;
  return typeof id === 'string' ? id : '';
});

const isEdit = computed<boolean>(() => Boolean(courseId.value));

const isDraft = computed(() => courseState.value === 'draft');
const canEditCourse = computed(() => courseState.value === 'draft' || courseState.value === 'scheduled');
const isReadOnly = computed(() => !canEditCourse.value); // live, paused, archived = readonly
const canToggleGroupUnlock = computed(() => ['draft', 'scheduled', 'live'].includes(courseState.value));
const allowedNextStates = computed(() => {
  const s = courseState.value;
  const next: Record<string, string[]> = {
    draft: ['scheduled', 'live'],
    scheduled: ['draft', 'live'],
    live: ['paused', 'archived'],
    paused: ['live', 'archived', 'scheduled'],
    archived: [],
  };
  const list = next[s] ?? ['draft', 'scheduled', 'live', 'paused', 'archived'];
  return [s, ...list.filter((x) => x !== s)];
});
const canChangeState = computed(() => allowedNextStates.value.length > 1);

const form = ref({
  name: '',
  description: '',
});

const isPublished = ref<boolean>(true);
const courseState = ref<string>('draft');
const courseLiveAt = ref<string>('');

const materials = ref<MaterialWithGroup[]>([]);
const showMaterialForm = ref<boolean>(false);
const materialFormMode = ref<'create' | 'edit'>('create');
const editingMaterial = ref<MaterialEditData | null>(null);

const quizzes = ref<CourseQuiz[]>([]);
const showQuizForm = ref(false);
const showQuizPresetSelector = ref(false);
const quizForm = ref<QuizForm>({
  title: '',
  questions: [],
});

const feed = ref<FeedItem[]>([]);
const feedForm = ref<{ uuid?: string; message: string }>({ message: '' });
const showFeedForm = ref(false);
const showFeedPresetSelector = ref(false);

const materialPresets = ref<any[]>([]);
const quizPresets = ref<any[]>([]);
const feedPresets = ref<any[]>([]);
const showMaterialPresetSelector = ref(false);

const loading = ref<boolean>(false);

const groups = ref<ModuleDto[]>([]);
const expandedDashboardGroupUuid = ref<string | null>(null);

function toggleDashboardGroup(uuid: string) {
  expandedDashboardGroupUuid.value = expandedDashboardGroupUuid.value === uuid ? null : uuid;
}

const editingGroup = ref<ModuleDto | null>(null);
const groupForm = ref<{ title: string; description: string; scheduledUnlockAt?: string }>({ title: '', description: '' });
const draggedGroupIndex = ref<number | null>(null);
const showGroupForm = ref(false);

type GroupableType = 'material' | 'quiz' | 'feed';
const groupPicker = ref<{ type: GroupableType; uuid: string } | null>(null);
const selectedGroupForPicker = ref<string>('');


function normalizeIsPublishedFlag(value: any): boolean {
  if (value === undefined || value === null) return true;
  return value === true || value === 1;
}

async function saveCourseState() {
  try {
    const updated = await api<CourseResponse>(`/dashboard/courses/${courseId.value}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: courseState.value }),
    });
    courseState.value = (updated as any).state ?? courseState.value;
  } catch {
    alert('Nepodařilo se změnit stav kurzu.');
  }
}

async function saveCourseLiveAt() {
  try {
    await api(`/dashboard/courses/${courseId.value}/live-at`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liveAt: courseLiveAt.value || null }),
    });
  } catch {
    alert('Nepodařilo se uložit datum zveřejnění.');
  }
}

const justCreatedOrDuplicated = ref(false);
let justCreatedOrDuplicatedAt = 0;

async function duplicateCourse() {
  try {
    const duplicated = await api<CourseResponse>(`/dashboard/courses/${courseId.value}/duplicate`, {
      method: 'POST',
    });
    justCreatedOrDuplicated.value = true;
    justCreatedOrDuplicatedAt = Date.now();
    router.replace(`/dashboard/courses/${(duplicated as any).uuid}/edit`);
  } catch {
    alert('Nepodařilo se duplikovat kurz.');
  }
}

async function loadCourse(): Promise<void> {
  if (!isEdit.value) return;

  loading.value = true;
  try {
    const dashboardCourse = await api<CourseResponse & { groups?: ModuleDto[]; materials?: Material[]; quizzes?: CourseQuiz[]; feed?: FeedItem[] }>(`/dashboard/courses/${courseId.value}`);

    form.value = {
      name: dashboardCourse.name ?? '',
      description: dashboardCourse.description ?? '',
    };
    isPublished.value = normalizeIsPublishedFlag((dashboardCourse as any).isPublished);
    courseState.value = (dashboardCourse as any).state ?? 'draft';
    courseLiveAt.value = (dashboardCourse as any).liveAt ? toDatetimeLocal(String((dashboardCourse as any).liveAt)) : '';

    materials.value = Array.isArray((dashboardCourse as any).materials) ? (dashboardCourse as any).materials : [];
    quizzes.value = Array.isArray((dashboardCourse as any).quizzes) ? (dashboardCourse as any).quizzes : [];
    feed.value = Array.isArray((dashboardCourse as any).feed) ? (dashboardCourse as any).feed : [];
    groups.value = Array.isArray((dashboardCourse as any).groups) ? (dashboardCourse as any).groups : [];
    if (groups.value.length > 0 && !expandedDashboardGroupUuid.value) {
      expandedDashboardGroupUuid.value = groups.value[0]?.uuid ?? null;
    }
  } catch {
    alert('Nepodařilo se načíst kurz');
  } finally {
    loading.value = false;
  }
}

function groupMaterials(groupUuid: string) {
  return materials.value.filter((m) => m.moduleUuid === groupUuid);
}

function groupQuizzes(groupUuid: string) {
  return quizzes.value.filter((q) => q.moduleUuid === groupUuid);
}

function groupFeed(groupUuid: string) {
  return feed.value.filter((item) => item.moduleUuid === groupUuid);
}

function stripMarkdownBold(text: string): string {
  return (text ?? '').replace(/\*\*/g, '');
}

function feedPreview(message: string) {
  const cleaned = stripMarkdownBold(message ?? '');
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
}

function openScheduledUnlockDialog(group: ModuleDto) {
  if (isReadOnly.value) return;
  // Open group form with focus on scheduled unlock
  openGroupForm(group);
}

function openGroupForm(group?: ModuleDto) {
  if (isReadOnly.value) return;
  if (group) {
    editingGroup.value = group;
    groupForm.value = {
      title: group.title,
      description: group.description || '',
      scheduledUnlockAt: group.scheduledUnlockAt ? toDatetimeLocal(group.scheduledUnlockAt) : '',
    };
  } else {
    editingGroup.value = null;
    groupForm.value = { title: '', description: '' };
  }
  showGroupForm.value = true;
}

/** Backend returns "YYYY-MM-DD HH:mm" (what frontend sends). Convert to YYYY-MM-DDTHH:mm for datetime-local */
function toDatetimeLocal(val: string): string {
  if (!val) return '';
  const s = val.trim().replace(' ', 'T');
  const m = s.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  return m ? m[0] : '';
}

/** Display the scheduled time as-is (backend returns what frontend sent) */
function formatScheduledUnlock(val: string | undefined): string {
  if (!val) return '';
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (m) return `${m[3] ?? ''}. ${parseInt(m[2] ?? '0', 10)}. ${m[1] ?? ''} ${m[4] ?? '00'}:${m[5] ?? '00'}`;
  return val;
}

function canMoveGroupUp(group: ModuleDto): boolean {
  const idx = groups.value.findIndex((g) => g.uuid === group.uuid);
  return idx > 0;
}

function canMoveGroupDown(group: ModuleDto): boolean {
  const idx = groups.value.findIndex((g) => g.uuid === group.uuid);
  return idx >= 0 && idx < groups.value.length - 1;
}

async function moveGroupUp(group: ModuleDto) {
  if (!isDraft.value) return;
  const idx = groups.value.findIndex((g) => g.uuid === group.uuid);
  if (idx <= 0) return;
  await reorderGroups(idx, idx - 1);
}

async function moveGroupDown(group: ModuleDto) {
  if (!isDraft.value) return;
  const idx = groups.value.findIndex((g) => g.uuid === group.uuid);
  if (idx < 0 || idx >= groups.value.length - 1) return;
  await reorderGroups(idx, idx + 1);
}

async function reorderGroups(fromIndex: number, toIndex: number) {
  const reordered = [...groups.value];
  const [removed] = reordered.splice(fromIndex, 1);
  if (removed == null) return;
  reordered.splice(toIndex, 0, removed);
  groups.value = reordered;
  try {
    const orderedUuids = reordered.map((g) => g.uuid);
    await api<ModuleDto[]>(`/dashboard/courses/${courseId.value}/groups`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedUuids }),
    });
  } catch {
    groups.value = await api<ModuleDto[]>(`/dashboard/courses/${courseId.value}/groups`);
    alert('Nepodařilo se změnit pořadí skupin.');
  }
}

function onGroupDragStart(e: DragEvent, group: ModuleDto) {
  if (isReadOnly.value) {
    e.preventDefault();
    return;
  }
  const index = groups.value.findIndex((g) => g.uuid === group.uuid);
  draggedGroupIndex.value = index >= 0 ? index : null;
  e.dataTransfer?.setData('text/plain', String(index));
}

function onGroupDragover(e: DragEvent) {
  e.preventDefault();
}

function onDropOnGroupBody(e: DragEvent, group: ModuleDto) {
  if (isReadOnly.value) return;
  e.stopPropagation();
  if (draggingItem.value) onDropOnGroup(group);
}

function onGroupDropOrItemDrop(e: DragEvent, dropGroup: ModuleDto) {
  if (isReadOnly.value) return;
  if (draggingItem.value) {
    e.stopPropagation();
    onDropOnGroup(dropGroup);
    return;
  }
  const dropIndex = groups.value.findIndex((g) => g.uuid === dropGroup.uuid);
  if (dropIndex >= 0) onGroupDrop(e, dropIndex);
}

async function onGroupDrop(_e: DragEvent, dropIndex: number) {
  if (isReadOnly.value) return;
  const from = draggedGroupIndex.value;
  draggedGroupIndex.value = null;
  if (from == null || from === dropIndex) return;
  await reorderGroups(from, dropIndex);
}

function closeGroupForm() {
  showGroupForm.value = false;
}

async function saveGroup() {
  if (!groupForm.value.title.trim()) return;
  const currentGroup = editingGroup.value;

  try {
    if (currentGroup) {
      const updated = await api<ModuleDto>(`/dashboard/courses/${courseId.value}/groups/${currentGroup.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: groupForm.value.title,
          description: groupForm.value.description || null,
          scheduledUnlockAt: groupForm.value.scheduledUnlockAt || null,
        }),
      });
      groups.value = groups.value.map((g) => (g.uuid === updated.uuid ? { ...g, ...updated } : g));
    } else {
      const created = await api<ModuleDto>(`/dashboard/courses/${courseId.value}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: groupForm.value.title,
          description: groupForm.value.description || null,
        }),
      });
      groups.value.push(created);
    }
    closeGroupForm();
    await loadCourse();
  } catch {
    alert('Nepodařilo se uložit skupinu.');
  }
}

async function deleteGroup(group: ModuleDto) {
  if (isReadOnly.value) return;
  if (group.title === 'Nezařazené') {
    alert('Skupinu "Nezařazené" nelze smazat.');
    return;
  }
  if (!confirm(`Smazat skupinu "${group.title}"? Materiály, kvízy a oznámení v ní zůstanou v kurzu jako nezařazené.`)) return;
  try {
    await api<void>(`/dashboard/courses/${courseId.value}/groups/${group.uuid}`, { method: 'DELETE' });
    groups.value = groups.value.filter((g) => g.uuid !== group.uuid);
    await loadCourse();
  } catch (err: any) {
    alert(err.message || 'Nepodařilo se smazat skupinu.');
  }
}

async function toggleGroupUnlock(group: ModuleDto) {
  if (!canToggleGroupUnlock.value) return;
  try {
    const updated = await api<ModuleDto>(`/dashboard/courses/${courseId.value}/groups/${group.uuid}/unlock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isUnlocked: !group.isUnlocked }),
    });
    groups.value = groups.value.map((g) => (g.uuid === updated.uuid ? updated : g));
  } catch {
    alert('Nepodařilo se změnit stav skupiny.');
  }
}

function openGroupPicker(type: GroupableType, uuid: string) {
  if (isReadOnly.value) return;
  groupPicker.value = { type, uuid };
}

async function applyGroupSelection(moduleUuid: string | null) {
  if (!groupPicker.value) return;
  const { type, uuid } = groupPicker.value;
  groupPicker.value = null;

  try {
    if (type === 'material') {
      await api(`/dashboard/courses/${courseId.value}/materials/${uuid}/module`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleUuid }),
      });
    } else if (type === 'quiz') {
      await api(`/dashboard/courses/${courseId.value}/quizzes/${uuid}/module`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleUuid }),
      });
    } else if (type === 'feed') {
      await api(`/dashboard/courses/${courseId.value}/feed/${uuid}/module`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleUuid }),
      });
    }
    await loadCourse();
  } catch {
    alert('Nepodařilo se změnit skupinu.');
  }
}

type DragItemType = 'material' | 'quiz' | 'feed';
const draggingItem = ref<{ type: DragItemType; uuid: string; sourceModuleUuid: string | null } | null>(null);

function onDragStart(type: DragItemType, uuid: string, sourceModuleUuid: string | null, ev: DragEvent) {
  if (isReadOnly.value) {
    ev.preventDefault();
    return;
  }
  draggingItem.value = { type, uuid, sourceModuleUuid };
  try {
    ev.dataTransfer?.setData('text/plain', `${type}:${uuid}`);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  } catch {
    // ignore
  }
}

async function onDropOnGroup(group: ModuleDto | null) {
  if (isReadOnly.value) return;
  if (!draggingItem.value) return;
  let groupUuid = group ? group.uuid : null;
  const item = draggingItem.value;
  draggingItem.value = null;

  // If dropped on same group (or same "ungrouped"), do nothing
  const sourceUuid = item.sourceModuleUuid;
  if (groupUuid === sourceUuid) return;

  try {
    // Ensure we always assign to a group (use "Nezařazené" if null)
    if (!groupUuid) {
      const ungroupedGroup = groups.value.find(g => g.title === 'Nezařazené');
      if (!ungroupedGroup) {
        alert('Nelze přesunout položku - skupina "Nezařazené" neexistuje.');
        return;
      }
      groupUuid = ungroupedGroup.uuid;
    }
    
    if (item.type === 'material') {
      await api(`/dashboard/courses/${courseId.value}/materials/${item.uuid}/group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleUuid: groupUuid }),
      });
    } else if (item.type === 'quiz') {
      await api(`/dashboard/courses/${courseId.value}/quizzes/${item.uuid}/group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleUuid: groupUuid }),
      });
    } else if (item.type === 'feed') {
      await api(`/dashboard/courses/${courseId.value}/feed/${item.uuid}/group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleUuid: groupUuid }),
      });
    }
    await loadCourse();
  } catch {
    alert('Nepodařilo se přesunout položku do skupiny.');
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

async function saveCourse(): Promise<void> {
  try {
    if (isEdit.value) {
      if (!canEditCourse.value || isReadOnly.value) return;
      await api<void>(`/dashboard/courses/${courseId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value),
      });
    } else {
      const newCourse = await api<{ uuid: string }>('/dashboard/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value),
      });
      justCreatedOrDuplicated.value = true;
      justCreatedOrDuplicatedAt = Date.now();
      router.replace(`/dashboard/courses/${newCourse.uuid}/edit`);
    }
  } catch {
    alert('Nepodařilo se uložit kurz.');
  }
}

async function handleCourseSubmit(): Promise<void> {
  if (!form.value.name?.trim()) {
    alert('Název kurzu je povinný.');
    return;
  }
  await saveCourse();
}

// Auto-save course form changes (only when draft / editable)
watch([() => form.value.name, () => form.value.description], () => {
  if (!isEdit.value || !canEditCourse.value || isReadOnly.value) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveCourse();
  }, 1000);
}, { deep: true });

/* Materials */
const materialGroupUuid = ref<string | null>(null);

async function startCreateMaterialForGroup(groupUuid: string): Promise<void> {
  if (isReadOnly.value) return;
  editingMaterial.value = null;
  materialFormMode.value = 'create';
  // Ensure groupUuid is always set (should be provided, but fallback to "Nezařazené")
  if (!groupUuid) {
    const ungroupedGroup = groups.value.find(g => g.title === 'Nezařazené');
    if (!ungroupedGroup) {
      alert('Nelze vytvořit materiál - skupina "Nezařazené" neexistuje.');
      return;
    }
    materialGroupUuid.value = ungroupedGroup.uuid;
  } else {
    materialGroupUuid.value = groupUuid;
  }
  
  // Load presets and show selector
  try {
    materialPresets.value = await api('/dashboard/presets/materials');
    if (materialPresets.value.length > 0) {
      showMaterialPresetSelector.value = true;
    } else {
      showMaterialForm.value = true;
    }
  } catch {
    showMaterialForm.value = true;
  }
}

function useMaterialPreset(preset: any) {
  showMaterialPresetSelector.value = false;
  editingMaterial.value = {
    name: preset.name,
    type: preset.type,
    description: preset.description || undefined,
    url: preset.url || undefined,
    moduleUuid: materialGroupUuid.value,
  };
  showMaterialForm.value = true;
}

function createMaterialFromScratch() {
  showMaterialPresetSelector.value = false;
  editingMaterial.value = null;
  showMaterialForm.value = true;
}

function startEditMaterial(material: MaterialWithGroup): void {
  editingMaterial.value = {
    uuid: material.uuid,
    type: material.type,
    name: material.name,
    description: material.description,
    url: material.type === 'url' ? material.url : undefined,
    moduleUuid: material.moduleUuid,
  };
  materialFormMode.value = 'edit';
  showMaterialForm.value = true;
}

function onCancelMaterial(): void {
  showMaterialForm.value = false;
  editingMaterial.value = null;
}

async function onMaterialSaved(): Promise<void> {
  showMaterialForm.value = false;
  editingMaterial.value = null;
  materialGroupUuid.value = null;
  await loadCourse();
}

async function deleteMaterial(material: MaterialWithGroup): Promise<void> {
  if (isReadOnly.value) return;
  if (!confirm(`Smazat materiál "${material.name}"?`)) return;
  try {
    await api<void>(`/courses/${courseId.value}/materials/${material.uuid}`, { method: 'DELETE' });
    await loadCourse();
  } catch {
    alert('Failed to delete material.');
  }
}

/* Quizzes */
const quizGroupUuid = ref<string | null>(null);

async function startCreateQuizForGroup(groupUuid: string) {
  if (isReadOnly.value) return;
  // Ensure groupUuid is always set (should be provided, but fallback to "Nezařazené")
  let finalGroupUuid = groupUuid;
  if (!finalGroupUuid) {
    const ungroupedGroup = groups.value.find(g => g.title === 'Nezařazené');
    if (!ungroupedGroup) {
      alert('Nelze vytvořit kvíz - skupina "Nezařazené" neexistuje.');
      return;
    }
    finalGroupUuid = ungroupedGroup.uuid;
  }
  quizGroupUuid.value = finalGroupUuid;
  
  // Load presets and show selector
  try {
    quizPresets.value = await api('/dashboard/presets/quizzes');
    if (quizPresets.value.length > 0) {
      showQuizPresetSelector.value = true;
    } else {
      quizForm.value = { title: '', questions: [], countOnlyLastAnswer: false };
      addQuestion();
      showQuizForm.value = true;
    }
  } catch {
    quizForm.value = { title: '', questions: [], countOnlyLastAnswer: false };
    addQuestion();
    showQuizForm.value = true;
  }
}

function useQuizPreset(preset: any) {
  showQuizPresetSelector.value = false;
  quizForm.value = {
    title: preset.title,
    countOnlyLastAnswer: preset.countOnlyLastAnswer || false,
    questions: (preset.questions || []).map((q: any) => ({
      uuid: crypto.randomUUID(),
      type: q.type,
      question: q.question,
      optionsText: (q.options || []).join('\n'),
      correctIndex: q.correctIndex,
      correctIndices: [...(q.correctIndices || [])],
    })),
  };
  if (quizForm.value.questions.length === 0) {
    addQuestion();
  }
  showQuizForm.value = true;
}

function createQuizFromScratch() {
  showQuizPresetSelector.value = false;
  quizForm.value = { title: '', questions: [], countOnlyLastAnswer: false };
  addQuestion();
  showQuizForm.value = true;
}

function addQuestion() {
  quizForm.value.questions.push({
    uuid: crypto.randomUUID(),
    type: 'singleChoice',
    question: '',
    optionsText: 'Možnost 1\nMožnost 2',
    correctIndex: 0,
    correctIndices: [],
  });
}

function parsedOptions(q: QuizQuestionForm): string[] {
  return q.optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
}

function removeQuestion(idx: number) {
  quizForm.value.questions.splice(idx, 1);
}

function mapQuestionPayload(q: QuizQuestionForm) {
  const options = q.optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
  return {
    uuid: q.uuid,
    type: q.type,
    question: q.question,
    options,
    correctIndex: q.type === 'singleChoice' ? q.correctIndex ?? 0 : undefined,
    correctIndices: q.type === 'multipleChoice' ? (q.correctIndices || []).filter((i) => i >= 0 && i < options.length) : undefined,
  };
}

async function saveQuiz() {
  if (quizForm.value.questions.length === 0) {
    alert('Kvíz musí mít alespoň jednu otázku.');
    return;
  }
  try {
    const payload = {
      title: quizForm.value.title,
      questions: quizForm.value.questions.map(mapQuestionPayload),
      countOnlyLastAnswer: quizForm.value.countOnlyLastAnswer || false,
      moduleUuid: quizGroupUuid.value || null,
    };

    if (quizForm.value.uuid) {
      await api(`/courses/${courseId.value}/quizzes/${quizForm.value.uuid}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      await api(`/courses/${courseId.value}/quizzes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    showQuizForm.value = false;
    quizGroupUuid.value = null;
    await loadCourse();
  } catch (err) {
    alert('Nepodařilo se uložit kvíz');
  }
}

function editQuiz(quiz: CourseQuiz) {
  if (isReadOnly.value) return;
  quizForm.value = {
    uuid: quiz.uuid,
    title: quiz.title,
    countOnlyLastAnswer: quiz.countOnlyLastAnswer || false,
    questions: (quiz.questions || []).map((q: any) => ({
      uuid: q.uuid,
      type: q.type,
      question: q.question,
      optionsText: (q.options || []).join('\n'),
      correctIndex: q.correctIndex,
      correctIndices: [...(q.correctIndices || [])],
    })),
  };
  quizGroupUuid.value = quiz.moduleUuid || null;
  showQuizForm.value = true;
}

async function deleteQuiz(quiz: CourseQuiz) {
  if (isReadOnly.value) return;
  if (!confirm(`Smazat kvíz "${quiz.title}"?`)) return;
  try {
    await api(`/courses/${courseId.value}/quizzes/${quiz.uuid}`, { method: 'DELETE' });
    await loadCourse();
  } catch {
    alert('Failed to delete quiz.');
  }
}

function cancelQuiz() {
  showQuizForm.value = false;
  quizGroupUuid.value = null;
}

/* Feed */
const feedGroupUuid = ref<string | null>(null);

async function startCreateFeedForGroup(groupUuid: string) {
  // Ensure groupUuid is always set (should be provided, but fallback to "Nezařazené")
  let finalGroupUuid = groupUuid;
  if (!finalGroupUuid) {
    const ungroupedGroup = groups.value.find(g => g.title === 'Nezařazené');
    if (!ungroupedGroup) {
      alert('Nelze vytvořit oznámení - skupina "Nezařazené" neexistuje.');
      return;
    }
    finalGroupUuid = ungroupedGroup.uuid;
  }
  feedGroupUuid.value = finalGroupUuid;
  
  // Load presets and show selector
  try {
    feedPresets.value = await api('/dashboard/presets/feeds');
    if (feedPresets.value.length > 0) {
      showFeedPresetSelector.value = true;
    } else {
      feedForm.value = { message: '' };
      showFeedForm.value = true;
    }
  } catch {
    feedForm.value = { message: '' };
    showFeedForm.value = true;
  }
}

function useFeedPreset(preset: any) {
  showFeedPresetSelector.value = false;
  feedForm.value = { message: preset.message };
  showFeedForm.value = true;
}

function createFeedFromScratch() {
  showFeedPresetSelector.value = false;
  feedForm.value = { message: '' };
  showFeedForm.value = true;
}

function editFeed(item: FeedItem) {
  if (isReadOnly.value) return;
  feedForm.value = { uuid: item.uuid, message: item.message };
  showFeedForm.value = true;
}

function cancelFeedForm() {
  showFeedForm.value = false;
  feedForm.value = { message: '' };
  feedGroupUuid.value = null;
}

async function submitFeedForm() {
  if (!feedForm.value.message.trim()) return;
  try {
    if (feedForm.value.uuid) {
      const updated = await api<FeedItem>(`/courses/${courseId.value}/feed/${feedForm.value.uuid}`, {
        method: 'PUT',
        body: JSON.stringify({ message: feedForm.value.message }),
      });
      feed.value = feed.value.map((f) => (f.uuid === updated.uuid ? updated : f));
    } else {
      const created = await api<FeedItem>(`/courses/${courseId.value}/feed`, {
        method: 'POST',
        body: JSON.stringify({ message: feedForm.value.message, moduleUuid: feedGroupUuid.value }),
      });
      feed.value = [created, ...feed.value];
    }
    cancelFeedForm();
  } catch {
    alert('Nepodařilo se uložit příspěvek');
  }
}

async function removeFeed(item: FeedItem) {
  if (isReadOnly.value) return;
  if (!confirm('Smazat tento příspěvek?')) return;
  try {
    await api(`/courses/${courseId.value}/feed/${item.uuid}`, { method: 'DELETE' });
    feed.value = feed.value.filter((f) => f.uuid !== item.uuid);
  } catch {
    alert('Failed to delete post');
  }
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

// Load course when on edit page (by mount or when navigating from create to edit so "Nezařazené" appears)
watch(courseId, (id) => {
  if (id) loadCourse();
}, { immediate: true });

// Warn when navigating away shortly after create/duplicate, or when create form has unsaved data
onBeforeRouteLeave((_to, _from, next) => {
  const recentlyCreatedOrDuplicated = justCreatedOrDuplicated.value && (Date.now() - justCreatedOrDuplicatedAt < 10000);
  if (recentlyCreatedOrDuplicated) {
    const ok = confirm('Kurz byl právě vytvořen nebo duplikován. Použití tlačítka Zpět v prohlížeči může způsobit nečekané chování. Opravdu chcete odejít?');
    if (ok) justCreatedOrDuplicated.value = false;
    next(ok);
    return;
  }
  if (!isEdit.value && (form.value.name?.trim() || form.value.description?.trim())) {
    const ok = confirm('Máte neuložené změny. Opravdu chcete odejít?');
    next(ok);
    return;
  }
  next();
});
</script>

<style scoped>
.course-form { min-height: 60vh; display: grid; gap: 24px; }
.section { background: #fff; border: 1px solid var(--color-border); border-radius: 14px; padding: 18px 20px; box-shadow: 0 8px 20px var(--color-shadow); }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.section-head h3 { margin: 0; color: var(--color-primary-dark); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field input, .field textarea, .field select { padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 3px rgba(0,112,187,0.15); }
.form-actions-top { 
  margin-bottom: 16px; 
  display: flex;
  gap: 12px;
  align-items: center;
}
.form-actions-top .btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 10px 18px;
  box-sizing: border-box;
  font: inherit;
  cursor: pointer;
}
.form-actions { display: flex; gap: 12px; margin-top: 6px; }
.form-actions-left { flex: 1; display: flex; align-items: center; }
.form-actions-right { display: flex; gap: 12px; }
.form-actions--end { justify-content: flex-end; }
.form-actions--center { justify-content: center; }
.btn-primary { background: var(--color-primary); color: white; border: none; padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-primary:hover { background: var(--color-primary-dark); }
.btn-secondary { background: #fff; color: var(--color-primary-dark); padding: 10px 18px; border-radius: 10px; text-decoration: none; border: 1px solid var(--color-border); cursor: pointer; font-weight: 600; }
.btn-secondary:hover { background: rgba(145, 245, 173, 0.18); }
.btn-save { background: var(--color-primary); color: white; border: none; padding: 10px 16px; border-radius: 10px; cursor: pointer; }
.btn-save:hover { background: var(--color-primary-dark); }
.btn-cancel { background: #fff; color: var(--color-primary-dark); padding: 10px 16px; border-radius: 10px; text-decoration: none; border: 1px solid var(--color-border); }
.btn-cancel:hover { background: rgba(145, 245, 173, 0.18); }
.btn-add { background: var(--color-accent-strong); color: var(--color-text); border: none; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; }
.btn-add:hover { background: var(--color-accent); }
.btn-ghost { background: #fff; color: var(--color-primary-dark); padding: 10px 16px; border-radius: 10px; text-decoration: none; border: 1px solid var(--color-border); }
.btn-ghost:hover { background: rgba(145, 245, 173, 0.18); }
.btn-delete { background: var(--color-teal-strong); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
.panel { background: #fff; border: 1px solid var(--color-border); border-radius: 14px; box-shadow: 0 8px 20px var(--color-shadow); padding: 18px 20px; }
.panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.panel-body { display: flex; flex-direction: column; gap: 14px; }
.questions { display: grid; gap: 12px; margin: 10px 0; }
.question-card { border: 1px solid var(--color-border); padding: 10px; border-radius: 8px; background: var(--color-surface); background: rgba(145, 245, 173, 0.15); }
.correct-options-list { display: grid; gap: 8px; margin-top: 6px; }
.correct-option { display: flex; gap: 8px; align-items: center; cursor: pointer; }
.correct-option span { color: var(--color-text); }
.question-top { display: flex; justify-content: space-between; align-items: center; }
.quiz-list { display: grid; gap: 10px; }
.quiz-row { display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; background: rgba(145, 245, 173, 0.15); }
.row-actions { 
  display: flex; 
  gap: 8px; 
  align-items: center;
  flex-shrink: 0;
  min-width: 280px;
  justify-content: flex-end;
}
.muted { color: var(--color-text-muted); }
.small { font-size: 0.9rem; }
.analytics-stats p { margin: 8px 0; }
.empty { color: var(--color-text-muted); margin-top: 8px; }

.group-row {
  border-style: dashed;
  flex-direction: column;
  align-items: stretch;
}

.group-row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.group-toggle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.group-toggle-btn:hover {
  color: var(--color-primary-dark);
}

.group-controls-indent {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 88px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
  box-sizing: border-box;
}

.group-move-buttons {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.group-move-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--color-text-muted);
  line-height: 1.1;
}

.group-move-btn:hover:not(:disabled) {
  color: var(--color-primary-dark);
  background: rgba(145, 245, 173, 0.2);
}

.group-move-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.group-drag-handle {
  font-size: 1rem;
  color: var(--color-text-muted);
  cursor: grab;
  flex-shrink: 0;
  user-select: none;
}

.group-drag-handle:active {
  cursor: grabbing;
}

.group-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  text-align: center;
}

.group-body {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.group-items {
  display: grid;
  gap: 6px;
}

.group-label {
  margin: 0;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.group-item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}

.group-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
}

.group-item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-item-main--centered {
  flex: 1;
  text-align: center;
  align-items: center;
}

.group-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.badge-ungrouped {
  background: rgba(120, 120, 120, 0.12);
  color: var(--color-text-muted);
}

.item-name {
  font-weight: 600;
  color: var(--color-text);
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.item-meta {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.group-row--ungrouped {
  background: rgba(255, 255, 255, 0.7);
}

.draggable-label {
  cursor: grab;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.draggable-label .badge-group {
  margin-left: 4px;
}

.feed-top .badge-group {
  margin-left: 8px;
}

.feed-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.feed-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(145, 245, 173, 0.14);
}

.feed-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feed-top {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.section-head {
  position: relative;
  z-index: 10;
  pointer-events: auto;
}

.section-head * {
  pointer-events: auto;
}

.quiz-list {
  position: relative;
  z-index: 1;
}

.quiz-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 60;
}

.quiz-form-panel {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow: auto;
}

.quiz-stats-panel {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow: auto;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(145, 245, 173, 0.1);
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.preset-item:hover {
  background: rgba(145, 245, 173, 0.2);
}

.preset-item strong {
  font-size: 1.1rem;
  color: var(--color-primary-dark);
}

.preset-type,
.preset-title,
.preset-meta {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.preset-desc,
.preset-message {
  font-size: 0.95rem;
  color: var(--color-text);
  margin-top: 4px;
}

.feed-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 80;
}

.feed-form {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow: auto;
}

.participants-names {
  margin-top: 8px;
  color: var(--color-text);
  font-size: 0.95rem;
}

.stats-actions {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.participant-answers-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid var(--color-border);
}

.participant-answers-section h4 {
  margin: 0 0 16px;
  color: var(--color-primary-dark);
}

.participant-answers-list {
  display: grid;
  gap: 16px;
}

.participant-group {
  margin-bottom: 20px;
}

.participant-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.participant-header strong {
  font-size: 1.1rem;
}

.tries-count {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.participant-attempt {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  background: rgba(145, 245, 173, 0.1);
  margin-bottom: 12px;
}

.attempt-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.attempt-score {
  font-weight: 700;
  color: var(--color-primary-dark);
}

.attempt-date {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-left: auto;
}

.attempt-answers {
  display: grid;
  gap: 10px;
}

.answer-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.answer-question {
  font-weight: 600;
  color: var(--color-text);
}

.answer-selection {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.7);
}

.answer-selection.correct {
  background: rgba(76, 175, 80, 0.15);
}

.answer-selection.incorrect {
  background: rgba(244, 67, 54, 0.15);
}

.answer-status {
  font-weight: 600;
  font-size: 0.9rem;
}

.answer-selection.correct .answer-status {
  color: #4caf50;
}

.answer-selection.incorrect .answer-status {
  color: #f44336;
}

.group-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.btn-add-small {
  background: var(--color-accent-strong);
  color: var(--color-text);
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.btn-add-small:hover {
  background: var(--color-accent);
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(145, 245, 173, 0.05);
}

.stat-row > span:first-child {
  display: flex;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
}

.stat-q {
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
  min-width: 200px;
}

.stat-pct {
  font-weight: 700;
  color: var(--color-primary-dark);
  font-size: 1.1rem;
}

.stat-count {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.option-distribution {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.opt-label {
  min-width: 120px;
  font-size: 0.9rem;
  color: var(--color-text);
}

.opt-bar-track {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  overflow: hidden;
}

.opt-bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

.opt-percent {
  min-width: 80px;
  text-align: right;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

@media (max-width: 900px) {
  .form-row { grid-template-columns: 1fr; }
  .panel-head, .section-head { align-items: flex-start; }
  .group-row-head { flex-direction: column; align-items: flex-start; }
  .stat-row > span:first-child { flex-direction: column; align-items: flex-start; }
  .option-row { flex-wrap: wrap; }
}
</style>

<template>
  <div class="quiz-form-overlay" role="dialog" aria-modal="true">
    <div class="panel quiz-form-panel">
      <header class="panel-head">
        <h3>{{ mode === 'edit' ? 'Upravit předvolbu kvízu' : 'Přidat předvolbu kvízu' }}</h3>
        <button class="btn-ghost" type="button" @click="$emit('cancel')">Zavřít</button>
      </header>
      <div class="panel-body">
        <div class="field">
          <label>Název předvolby</label>
          <input v-model="presetName" required placeholder="Např. Úvodní test" />
        </div>
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
          <button class="btn-save" type="button" @click="savePreset">Uložit předvolbu</button>
          <button class="btn-cancel" type="button" @click="$emit('cancel')">Zrušit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { api } from '../services/api';

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type QuizQuestionForm = {
  uuid: string;
  type: 'singleChoice' | 'multipleChoice';
  question: string;
  optionsText: string;
  correctIndex?: number;
  correctIndices?: number[];
};

const props = defineProps<{
  mode: 'create' | 'edit';
  initial?: {
    uuid?: string;
    name?: string;
    title?: string;
    countOnlyLastAnswer?: boolean;
    questions?: Array<{
      type: 'singleChoice' | 'multipleChoice';
      question: string;
      options: string[];
      correctIndex?: number;
      correctIndices?: number[];
    }>;
  } | null;
}>();

const emit = defineEmits<{
  (event: 'saved'): void;
  (event: 'cancel'): void;
}>();

const presetName = ref('');
const quizForm = reactive<{
  title: string;
  questions: QuizQuestionForm[];
  countOnlyLastAnswer: boolean;
}>({
  title: '',
  questions: [],
  countOnlyLastAnswer: false,
});

watch(
    () => props.initial,
    (value) => {
      if (value) {
        presetName.value = value.name ?? '';
        quizForm.title = value.title ?? '';
        quizForm.countOnlyLastAnswer = value.countOnlyLastAnswer || false;
        quizForm.questions = (value.questions || []).map((q) => ({
          uuid: randomUUID(),
          type: q.type,
          question: q.question,
          optionsText: (q.options || []).join('\n'),
          correctIndex: q.correctIndex,
          correctIndices: [...(q.correctIndices || [])],
        }));
      } else {
        presetName.value = '';
        quizForm.title = '';
        quizForm.countOnlyLastAnswer = false;
        quizForm.questions = [];
        addQuestion();
      }
    },
    { immediate: true }
);

function addQuestion() {
  quizForm.questions.push({
    uuid: randomUUID(),
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
  quizForm.questions.splice(idx, 1);
}

function mapQuestionPayload(q: QuizQuestionForm) {
  const options = q.optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
  return {
    type: q.type,
    question: q.question,
    options,
    correctIndex: q.type === 'singleChoice' ? q.correctIndex ?? 0 : undefined,
    correctIndices: q.type === 'multipleChoice' ? (q.correctIndices || []).filter((i) => i >= 0 && i < options.length) : undefined,
  };
}

async function savePreset() {
  if (!presetName.value || !quizForm.title) {
    alert('Název předvolby a název kvízu jsou povinné.');
    return;
  }
  if (quizForm.questions.length === 0) {
    alert('Kvíz musí mít alespoň jednu otázku.');
    return;
  }
  try {
    const payload = {
      name: presetName.value,
      title: quizForm.title,
      countOnlyLastAnswer: quizForm.countOnlyLastAnswer || false,
      questions: quizForm.questions.map(mapQuestionPayload),
    };

    const url = props.mode === 'edit' && props.initial?.uuid
        ? `/dashboard/presets/quizzes/${props.initial.uuid}`
        : `/dashboard/presets/quizzes`;

    await api(url, {
      method: props.mode === 'edit' ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    emit('saved');
  } catch (err) {
    alert('Nepodařilo se uložit předvolbu.');
  }
}
</script>

<style scoped>
.quiz-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}

.quiz-form-panel {
  width: min(800px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 8px 20px var(--color-shadow);
  padding: 18px 20px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.panel-body {
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-weight: 600;
  color: var(--color-text);
}

input, textarea, select {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(145, 245, 173, 0.05);
}

.question-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.correct-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.correct-option {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-save {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-cancel {
  background: transparent;
  color: var(--color-primary-dark);
  border: 1px solid var(--color-border);
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>

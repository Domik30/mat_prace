<template>
  <DashboardLayout name="Spravovat šablony">
    <template #actions>
      <router-link to="/dashboard" class="btn-back">← Zpět</router-link>
    </template>

    <div class="presets-management">
      <div class="presets-tabs">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'materials' }"
          @click="activeTab = 'materials'"
        >
          Materiály
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'quizzes' }"
          @click="activeTab = 'quizzes'"
        >
          Kvízy
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'feeds' }"
          @click="activeTab = 'feeds'"
        >
          Oznámení
        </button>
      </div>

      <!-- Material Presets -->
      <div v-if="activeTab === 'materials'" class="presets-content">
        <div class="presets-header-section">
          <h2>Předvolby materiálů</h2>
          <button class="btn-add" @click="openMaterialPresetForm()">+ Přidat předvolbu</button>
        </div>
        <div v-if="materialPresetsLoading" class="loading">Načítání…</div>
        <div v-else-if="materialPresets.length === 0" class="empty">Žádné předvolby materiálů</div>
        <div v-else class="presets-list">
          <div v-for="preset in materialPresets" :key="preset.uuid" class="preset-card">
            <div class="preset-info">
              <strong>{{ preset.name }}</strong>
              <span class="preset-type">{{ preset.type === 'file' ? 'Soubor' : 'Odkaz' }}</span>
              <span v-if="preset.description" class="preset-desc">{{ preset.description }}</span>
              <span v-if="preset.url" class="preset-url">{{ preset.url }}</span>
            </div>
            <div class="preset-actions">
              <button class="btn-edit" @click="editMaterialPreset(preset)">Upravit</button>
              <button class="btn-delete" @click="deleteMaterialPreset(preset)">Smazat</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quiz Presets -->
      <div v-if="activeTab === 'quizzes'" class="presets-content">
        <div class="presets-header-section">
          <h2>Předvolby kvízů</h2>
          <button class="btn-add" @click="openQuizPresetForm()">+ Přidat předvolbu</button>
        </div>
        <div v-if="quizPresetsLoading" class="loading">Načítání…</div>
        <div v-else-if="quizPresets.length === 0" class="empty">Žádné předvolby kvízů</div>
        <div v-else class="presets-list">
          <div v-for="preset in quizPresets" :key="preset.uuid" class="preset-card">
            <div class="preset-info">
              <strong>{{ preset.name }}</strong>
              <span class="preset-title">{{ preset.title }}</span>
              <span class="preset-meta">{{ preset.questions?.length || 0 }} otázek</span>
              <span v-if="preset.countOnlyLastAnswer" class="preset-flag">Pouze jednou</span>
            </div>
            <div class="preset-actions">
              <button class="btn-edit" @click="editQuizPreset(preset)">Upravit</button>
              <button class="btn-delete" @click="deleteQuizPreset(preset)">Smazat</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Feed Presets -->
      <div v-if="activeTab === 'feeds'" class="presets-content">
        <div class="presets-header-section">
          <h2>Předvolby oznámení</h2>
          <button class="btn-add" @click="openFeedPresetForm()">+ Přidat předvolbu</button>
        </div>
        <div v-if="feedPresetsLoading" class="loading">Načítání…</div>
        <div v-else-if="feedPresets.length === 0" class="empty">Žádné předvolby oznámení</div>
        <div v-else class="presets-list">
          <div v-for="preset in feedPresets" :key="preset.uuid" class="preset-card">
            <div class="preset-info">
              <strong>{{ preset.name }}</strong>
              <p class="preset-message">{{ preset.message }}</p>
            </div>
            <div class="preset-actions">
              <button class="btn-edit" @click="editFeedPreset(preset)">Upravit</button>
              <button class="btn-delete" @click="deleteFeedPreset(preset)">Smazat</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Material Preset Form -->
    <DashboardMaterialPresetForm
        v-if="showMaterialPresetForm"
        :mode="materialPresetFormMode"
        :initial="editingMaterialPreset"
        @saved="onMaterialPresetSaved"
        @cancel="showMaterialPresetForm = false"
    />

    <!-- Quiz Preset Form -->
    <DashboardQuizPresetForm
        v-if="showQuizPresetForm"
        :mode="quizPresetFormMode"
        :initial="editingQuizPreset"
        @saved="onQuizPresetSaved"
        @cancel="showQuizPresetForm = false"
    />

    <!-- Feed Preset Form -->
    <DashboardFeedPresetForm
        v-if="showFeedPresetForm"
        :mode="feedPresetFormMode"
        :initial="editingFeedPreset"
        @saved="onFeedPresetSaved"
        @cancel="showFeedPresetForm = false"
    />
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DashboardLayout from '../components/DashboardLayout.vue';
import DashboardMaterialPresetForm from '../components/DashboardMaterialPresetForm.vue';
import DashboardQuizPresetForm from '../components/DashboardQuizPresetForm.vue';
import DashboardFeedPresetForm from '../components/DashboardFeedPresetForm.vue';
import { api } from '../services/api';

const activeTab = ref<'materials' | 'quizzes' | 'feeds'>('materials');

const materialPresets = ref<any[]>([]);
const quizPresets = ref<any[]>([]);
const feedPresets = ref<any[]>([]);

const materialPresetsLoading = ref(false);
const quizPresetsLoading = ref(false);
const feedPresetsLoading = ref(false);

const showMaterialPresetForm = ref(false);
const showQuizPresetForm = ref(false);
const showFeedPresetForm = ref(false);
const materialPresetFormMode = ref<'create' | 'edit'>('create');
const quizPresetFormMode = ref<'create' | 'edit'>('create');
const feedPresetFormMode = ref<'create' | 'edit'>('create');
const editingMaterialPreset = ref<any>(null);
const editingQuizPreset = ref<any>(null);
const editingFeedPreset = ref<any>(null);

async function loadMaterialPresets() {
  materialPresetsLoading.value = true;
  try {
    materialPresets.value = await api('/dashboard/presets/materials');
  } catch {
    materialPresets.value = [];
  } finally {
    materialPresetsLoading.value = false;
  }
}

async function loadQuizPresets() {
  quizPresetsLoading.value = true;
  try {
    quizPresets.value = await api('/dashboard/presets/quizzes');
  } catch {
    quizPresets.value = [];
  } finally {
    quizPresetsLoading.value = false;
  }
}

async function loadFeedPresets() {
  feedPresetsLoading.value = true;
  try {
    feedPresets.value = await api('/dashboard/presets/feeds');
  } catch {
    feedPresets.value = [];
  } finally {
    feedPresetsLoading.value = false;
  }
}

function openMaterialPresetForm() {
  editingMaterialPreset.value = null;
  materialPresetFormMode.value = 'create';
  showMaterialPresetForm.value = true;
}

function editMaterialPreset(preset: any) {
  editingMaterialPreset.value = preset;
  materialPresetFormMode.value = 'edit';
  showMaterialPresetForm.value = true;
}

async function deleteMaterialPreset(preset: any) {
  if (!confirm(`Smazat předvolbu "${preset.name}"?`)) return;
  try {
    await api(`/dashboard/presets/materials/${preset.uuid}`, { method: 'DELETE' });
    await loadMaterialPresets();
  } catch {
    alert('Nepodařilo se smazat předvolbu.');
  }
}

function onMaterialPresetSaved() {
  showMaterialPresetForm.value = false;
  editingMaterialPreset.value = null;
  loadMaterialPresets();
}

function openQuizPresetForm() {
  editingQuizPreset.value = null;
  quizPresetFormMode.value = 'create';
  showQuizPresetForm.value = true;
}

function editQuizPreset(preset: any) {
  editingQuizPreset.value = preset;
  quizPresetFormMode.value = 'edit';
  showQuizPresetForm.value = true;
}

async function deleteQuizPreset(preset: any) {
  if (!confirm(`Smazat předvolbu "${preset.name}"?`)) return;
  try {
    await api(`/dashboard/presets/quizzes/${preset.uuid}`, { method: 'DELETE' });
    await loadQuizPresets();
  } catch {
    alert('Nepodařilo se smazat předvolbu.');
  }
}

function onQuizPresetSaved() {
  showQuizPresetForm.value = false;
  editingQuizPreset.value = null;
  loadQuizPresets();
}

function openFeedPresetForm() {
  editingFeedPreset.value = null;
  feedPresetFormMode.value = 'create';
  showFeedPresetForm.value = true;
}

function editFeedPreset(preset: any) {
  editingFeedPreset.value = preset;
  feedPresetFormMode.value = 'edit';
  showFeedPresetForm.value = true;
}

async function deleteFeedPreset(preset: any) {
  if (!confirm(`Smazat předvolbu "${preset.name}"?`)) return;
  try {
    await api(`/dashboard/presets/feeds/${preset.uuid}`, { method: 'DELETE' });
    await loadFeedPresets();
  } catch {
    alert('Nepodařilo se smazat předvolbu.');
  }
}

function onFeedPresetSaved() {
  showFeedPresetForm.value = false;
  editingFeedPreset.value = null;
  loadFeedPresets();
}

onMounted(() => {
  loadMaterialPresets();
  loadQuizPresets();
  loadFeedPresets();
});
</script>

<style scoped>
.presets-management {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border);
}

.presets-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--color-border);
}

.tab-button {
  background: transparent;
  border: none;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s;
}

.tab-button:hover {
  color: var(--color-primary-dark);
}

.tab-button.active {
  color: var(--color-primary-dark);
  border-bottom-color: var(--color-primary);
}

.presets-content {
  min-height: 400px;
}

.presets-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.presets-header-section h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-primary-dark);
}

.btn-add {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-add:hover {
  background: var(--color-primary-dark);
}

.btn-back {
  background: transparent;
  color: var(--color-primary-dark);
  border: 1px solid var(--color-border);
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}

.btn-back:hover {
  background: rgba(145, 245, 173, 0.18);
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.presets-list {
  display: grid;
  gap: 16px;
}

.preset-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(145, 245, 173, 0.05);
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.preset-info strong {
  font-size: 1.1rem;
  color: var(--color-primary-dark);
}

.preset-type,
.preset-title,
.preset-meta,
.preset-desc,
.preset-url,
.preset-flag {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.preset-message {
  margin: 8px 0 0;
  color: var(--color-text);
  white-space: pre-wrap;
}

.preset-actions {
  display: flex;
  gap: 8px;
}

.btn-edit {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.btn-edit:hover {
  background: var(--color-primary-dark);
}

.btn-delete {
  background: var(--color-teal-strong);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.btn-delete:hover {
  background: var(--color-primary-dark);
}
</style>

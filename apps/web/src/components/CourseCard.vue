<!-- src/components/CourseCard.vue -->
<template>
  <div
    class="card card--padded card--interactive course-card"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <h3 class="name">{{ course.name }}</h3>
    <p class="description">{{ course.description }}</p>
    <span class="view-more">View details →</span>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

interface Course {
  uuid: string;
  name: string;
  description: string;
}

defineProps({
  course: {
    type: Object as PropType<Course>,
    required: true,
  },
});

defineEmits(['click']);
</script>

<style scoped>
.course-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.name {
  margin: 0 0 15px 0;
  font-size: 1.4rem;
  color: var(--color-text);
}

.description {
  flex-grow: 1;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 20px;
}

.view-more {
  color: var(--color-primary-dark);
  font-weight: 900;
  align-self: flex-start;
}
</style>
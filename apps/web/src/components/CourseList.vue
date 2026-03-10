<!-- src/components/CourseList.vue -->
<template>
  <div class="course-list">
    <CourseCard
        v-for="course in courses"
        :key="course.uuid"
        :course="course"
        @click="() => $emit('course-click', course.uuid)"
    />
  </div>
</template>

<script setup lang="ts">
import CourseCard from './CourseCard.vue';

interface Course {
  uuid: string;
  name: string;
  description: string;
}

defineProps({
  courses: {
    type: Array as () => Course[],
    required: true,
  },
});

defineEmits(['course-click']);
</script>

<style scoped>
.course-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 40px;
}
</style>
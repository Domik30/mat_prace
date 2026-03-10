<!-- src/App.vue -->
<template>
  <Navbar />
  <router-view />
  <Footer />
</template>

<script setup lang="ts">
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
</script>
<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from './stores'
import { computed } from 'vue'

const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()

const tabs = [
  { path: '/', name: '计时', icon: '⏱️' },
  { path: '/history', name: '记录', icon: '📋' },
  { path: '/settings', name: '设置', icon: '⚙️' }
]

function navigateTo(path: string) {
  router.push(path)
}

const isActive = (path: string) => computed(() => route.path === path)
</script>

<template>
  <div class="app-container" :data-theme="settingsStore.theme">
    <div class="app-card">
      <RouterView />
    </div>

    <nav class="bottom-nav">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        class="nav-tab"
        :class="{ active: isActive(tab.path).value }"
        @click="navigateTo(tab.path)"
      >
        <span class="nav-icon">{{ tab.icon }}</span>
        <span class="nav-label">{{ tab.name }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-card {
  flex: 1;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
  padding: 16px;
  padding-bottom: 80px;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: var(--card-bg, #ffffff);
  border-top: 1px solid var(--border-color, #e0e0e0);
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  z-index: 100;
}

[data-theme="dark"] .bottom-nav {
  background: var(--card-bg-dark, #1d1d1d);
  border-color: var(--border-color-dark, #3d3d3d);
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  transition: background-color 0.2s;
  min-width: 64px;
}

.nav-tab:hover {
  background: var(--hover-bg, #f0f0f0);
}

[data-theme="dark"] .nav-tab:hover {
  background: var(--hover-bg-dark, #2d2d2d);
}

.nav-tab.active {
  color: var(--accent-color, #4CAF50);
}

.nav-tab.active .nav-icon {
  transform: scale(1.1);
}

.nav-icon {
  font-size: 24px;
  transition: transform 0.2s;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
}
</style>

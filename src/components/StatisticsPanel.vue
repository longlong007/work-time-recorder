<script setup lang="ts">
import { useWorkStore } from '../stores'
import { formatDuration } from '../utils/date'

const workStore = useWorkStore()
</script>

<template>
  <div class="statistics-section">
    <div class="stat-item">
      <span class="stat-label">今日总计</span>
      <span class="stat-value">{{ formatDuration(workStore.todayTotal) }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">本周总计</span>
      <span class="stat-value">{{ formatDuration(workStore.weekTotal) }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">本月总计</span>
      <span class="stat-value">{{ formatDuration(workStore.monthTotal) }}</span>
    </div>
  </div>
</template>

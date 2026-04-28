<script setup lang="ts">
import { ref } from 'vue'
import { useWorkStore } from '../stores'

const workStore = useWorkStore()

const showOptions = ref(false)
const customMinutes = ref(0)

const alarmMinutes = ref(0)
const alarmEnabled = ref(false)
let alarmTimeoutId: number | null = null

function toggleOptions() {
  showOptions.value = !showOptions.value
}

function selectPreset(minutes: number) {
  alarmMinutes.value = minutes
  alarmEnabled.value = true
  // Implementation would connect to useAlarm composable
}

function setCustom() {
  if (customMinutes.value > 0 && customMinutes.value <= 480) {
    alarmMinutes.value = customMinutes.value
    alarmEnabled.value = true
  }
}
</script>

<template>
  <div class="reminder-section">
    <div class="reminder-header">
      <span class="reminder-icon">⏰</span>
      <span class="reminder-label">闹钟提醒</span>
      <label class="alarm-toggle">
        <input type="checkbox" v-model="showOptions" />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div v-show="showOptions" class="reminder-options">
      <div class="preset-buttons">
        <button class="preset-btn" @click="selectPreset(5)">5分钟</button>
        <button class="preset-btn" @click="selectPreset(10)">10分钟</button>
        <button class="preset-btn" @click="selectPreset(15)">15分钟</button>
        <button class="preset-btn" @click="selectPreset(30)">30分钟</button>
        <button class="preset-btn" @click="selectPreset(45)">45分钟</button>
      </div>

      <div class="custom-alarm">
        <input
          v-model.number="customMinutes"
          type="number"
          class="custom-alarm-input"
          placeholder="自定义"
          min="1"
          max="480"
        />
        <span class="custom-alarm-unit">分钟</span>
        <button class="btn-set-alarm" @click="setCustom">设置</button>
      </div>

      <div v-if="alarmEnabled" class="alarm-status set">
        已设置 {{ alarmMinutes }} 分钟闹钟
      </div>
    </div>
  </div>
</template>

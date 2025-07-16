<template>
  <div class="save-section">
    <button @click="handleSave" class="save-button" :disabled="isLoading">
      {{ isLoading ? 'Saving...' : i18n.t('saveBookmark') }}
    </button>
    <div v-if="message" class="message" :class="{ 'error': message.includes('Error') }">
      {{ message }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { i18n } from '#i18n';

interface Props {
	message?: string;
	isLoading?: boolean;
}

type Emits = (e: 'save') => void;

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleSave = () => {
	emit('save');
};
</script>

<style scoped>
.save-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.save-button {
  background: #007AFF;
  color: white;
  border: none;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.save-button:hover:not(:disabled) {
  background: #0056CC;
}

.save-button:active:not(:disabled) {
  transform: scale(0.98);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
  background: #E8F5E8;
  color: #2D5A2D;
  border: 1px solid #B8E6B8;
}

.message.error {
  background: #FFE6E6;
  color: #CC0000;
  border: 1px solid #FFB8B8;
}
</style>

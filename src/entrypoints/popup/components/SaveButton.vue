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
  background: linear-gradient(135deg, #5e33a9 0%, #7c4dff 100%);
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
  background: linear-gradient(135deg, #4a2889 0%, #6a1b9a 100%);
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
  background: #f3f0ff;
  color: #5e33a9;
  border: 1px solid #d4c5f0;
}

.message.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
</style>

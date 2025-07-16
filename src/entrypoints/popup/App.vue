<script lang="ts" setup>
import { ref } from 'vue';
import { i18n } from '#i18n';

const currentUrl = ref('');
const currentTitle = ref('');
const message = ref('');

const getBookmarkToolbarId = async (): Promise<string> => {
	try {
		const bookmarkTree = await browser.bookmarks.getTree();
		const bookmarkBar = bookmarkTree[0]?.children?.find(
			(child) =>
				child.title === 'Bookmarks bar' || child.title === 'Bookmarks Toolbar',
		);
		return bookmarkBar?.id || '1';
	} catch {
		// Fallback to default bookmark toolbar ID
		return '1';
	}
};

const saveBookmark = async () => {
	try {
		const [tab] = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab?.url) {
			currentUrl.value = tab.url;
			currentTitle.value = tab.title || '';

			const toolbarId = await getBookmarkToolbarId();

			await browser.bookmarks.create({
				title: currentTitle.value,
				url: currentUrl.value,
				parentId: toolbarId,
			});

			message.value = i18n.t('bookmarkSaved');
			setTimeout(() => {
				message.value = '';
			}, 2000);
		}
	} catch {
		message.value = i18n.t('bookmarkError');
		setTimeout(() => {
			message.value = '';
		}, 2000);
	}
};
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>SearchMark</h1>
    </div>

    <div class="save-section">
      <button @click="saveBookmark" class="save-button">
        {{ i18n.t('saveBookmark') }}
      </button>
      <div v-if="message" class="message" :class="{ 'error': message.includes('Error') }">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 280px;
  padding: 16px;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-align: center;
  color: #1a1a1a;
}

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

.save-button:hover {
  background: #0056CC;
}

.save-button:active {
  transform: scale(0.98);
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

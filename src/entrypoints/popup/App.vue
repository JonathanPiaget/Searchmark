<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { i18n } from '#i18n';
import BookmarkForm from './components/BookmarkForm.vue';
import SaveButton from './components/SaveButton.vue';

const currentUrl = ref('');
const currentTitle = ref('');
const message = ref('');
const isLoading = ref(false);
const bookmarkUrl = ref('');
const bookmarkTitle = ref('');

const getBookmarkToolbarId = async () => {
	try {
		const [tree] = await browser.bookmarks.getTree();
		return tree.children?.[0]?.id || '1';
	} catch {
		return '1';
	}
};

const loadCurrentTab = async () => {
	try {
		const [tab] = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab?.url) {
			currentUrl.value = tab.url;
			currentTitle.value = tab.title || '';

			bookmarkUrl.value = currentUrl.value;
			bookmarkTitle.value = currentTitle.value;
		}
	} catch {
		message.value = i18n.t('bookmarkError');
		setTimeout(() => {
			message.value = '';
		}, 2000);
	}
};

onMounted(() => {
	loadCurrentTab();
});

const saveBookmark = async () => {
	isLoading.value = true;
	try {
		const toolbarId = await getBookmarkToolbarId();

		await browser.bookmarks.create({
			title: bookmarkTitle.value,
			url: bookmarkUrl.value,
			parentId: toolbarId,
		});

		// Show success notification in content script
		const [tab] = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab?.id) {
			await browser.tabs.sendMessage(tab.id, {
				type: 'SHOW_NOTIFICATION',
				message: i18n.t('bookmarkSaved'),
				isError: false,
			});
		}

		// Close the popup
		window.close();
	} catch {
		message.value = i18n.t('bookmarkError');
		setTimeout(() => {
			message.value = '';
		}, 2000);
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <img src="/icon.svg" alt="SearchMark Logo" class="logo">
        <h1>SearchMark</h1>
      </div>
    </div>

    <BookmarkForm
      v-model:model-url="bookmarkUrl"
      v-model:model-title="bookmarkTitle"
      @enter-pressed="saveBookmark"
    />

    <SaveButton
      :message="message"
      :is-loading="isLoading"
      @save="saveBookmark"
    />
  </div>
</template>

<style scoped>
.container {
  width: 320px;
  padding: 16px;
  background: white;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.logo {
  width: 24px;
  height: 24px;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
}
</style>

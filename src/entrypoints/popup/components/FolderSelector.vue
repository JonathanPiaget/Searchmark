<template>
  <div class="folder-selector">
    <div class="form-group">
      <label for="folder-search">{{ i18n.t('folder') }}</label>
      <div class="search-container">
        <input
          ref="folderInput"
          id="folder-search"
          v-model="searchQuery"
          type="text"
          class="form-input"
          :placeholder="i18n.t('searchFolders')"
          @input="onSearchInput"
          @keydown="handleKeydown"
          @focus="onFocus"
          @blur="onBlur"
        >
        <div v-if="showDropdown && searchQuery.trim()" class="shortcut-hint">
          {{ i18n.t('expandHint') }}
        </div>
        <div
          v-if="showDropdown && searchQuery.trim()"
          class="dropdown-container"
        >
      <div v-if="searchResults.length > 0">
        <div
          v-for="(item, index) in searchResults"
          :key="`${item.type}-${item.folder.id}`"
          :class="['dropdown-item', { highlighted: index === highlightedIndex }, item.type]"
          @mousedown="selectFolder(item.folder)"
          @mouseenter="highlightedIndex = index"
          @keydown="handleItemKeydown($event, item)"
          tabindex="-1"
        >
          <div class="folder-info">
            <div class="folder-main">
              <div class="folder-name-section">
                <span class="folder-icon">📁</span>
                <span class="folder-name" v-html="highlightText(item.folder.title, searchQuery)"></span>
              </div>
              <div v-if="item.folder.children && item.folder.children.length > 0" class="folder-actions">
                <span class="children-count">
                  ({{ item.folder.children.length }} {{ item.folder.children.length === 1 ? i18n.t('child') : i18n.t('children') }})
                </span>
                <span class="expand-hint">
                  →
                </span>
              </div>
            </div>
            <div v-if="item.folder.path" class="folder-breadcrumb">
              {{ item.folder.path }}
            </div>
            <div v-if="showChildrenFor === item.folder.id && item.folder.children && item.folder.children.length > 0" class="children-list">
              <div class="children-header">{{ i18n.t('contains') }}:</div>
              <div class="children-items">
                <span
                  v-for="child in item.folder.children"
                  :key="child.id"
                  class="child-folder"
                  @click.stop="selectChildFolder(child)"
                  @mousedown.stop
                >
                  📁 {{ child.title }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-results">
        <div class="no-results-icon">🔍</div>
        <div class="no-results-text">{{ i18n.t('noFoldersFound') }}</div>
        <div class="no-results-hint">{{ i18n.t('tryDifferentSearch') }}</div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { i18n } from '#i18n';
import type { SearchResultItem } from '../../../composables/useFolderSearch';
import { useFolderSearch } from '../../../composables/useFolderSearch';
import type { BookmarkFolder } from '../../../composables/useFolderTree';
import { useFolderTree } from '../../../composables/useFolderTree';
import { useKeyboardNavigation } from '../../../composables/useKeyboardNavigation';
import { getBookmarkToolbarId } from '../../../utils/bookmark';

interface Props {
	modelValue: string;
}

interface Emits {
	(e: 'update:modelValue', value: string): void;
	(e: 'folderSelected', folder: { id: string; name: string }): void;
	(e: 'enterPressed'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDropdown = ref(false);
const folderInput = ref<HTMLInputElement>();
const selectedFolder = ref<BookmarkFolder | null>(null);

const { allFolders, loadFolders } = useFolderTree();
const { searchQuery, searchResults, searchFolders, highlightText } =
	useFolderSearch(allFolders);
const { highlightedIndex, showChildrenFor, handleNavigation, resetNavigation } =
	useKeyboardNavigation();

const initializeFolders = async () => {
	await loadFolders();

	if (!props.modelValue) {
		const toolbarId = await getBookmarkToolbarId();
		const bookmarkToolbar = allFolders.value.find((f) => f.id === toolbarId);
		if (bookmarkToolbar) {
			selectedFolder.value = bookmarkToolbar;
			searchQuery.value = bookmarkToolbar.title;
			emit('update:modelValue', bookmarkToolbar.id);
			emit('folderSelected', {
				id: bookmarkToolbar.id,
				name: bookmarkToolbar.title,
			});
		}
	}
};

const onSearchInput = () => {
	const newHighlightedIndex = searchFolders();
	if (newHighlightedIndex !== undefined) {
		highlightedIndex.value = newHighlightedIndex;
	}
	showDropdown.value = searchQuery.value.trim().length > 0;
};

const onFocus = () => {
	// Clear the input when focused for search
	searchQuery.value = '';
	showDropdown.value = false;
};

const selectFolder = (folder: BookmarkFolder) => {
	selectedFolder.value = folder;
	searchQuery.value = folder.title;
	showDropdown.value = false;
	resetNavigation();
	emit('update:modelValue', folder.id);
	emit('folderSelected', { id: folder.id, name: folder.title });
};

const selectChildFolder = (child: BookmarkFolder) => {
	// Find the full folder object from allFolders to ensure it has all properties
	const fullFolder = allFolders.value.find((f) => f.id === child.id) || child;
	selectFolder(fullFolder);
};

const onBlur = () => {
	setTimeout(() => {
		showDropdown.value = false;
		resetNavigation();
		if (!showDropdown.value && selectedFolder.value) {
			searchQuery.value = selectedFolder.value.title;
		} else if (!showDropdown.value) {
			searchQuery.value = '';
		}
	}, 150);
};

const handleKeydown = (event: KeyboardEvent) => {
	if (!showDropdown.value && searchQuery.value.trim()) {
		if (
			event.key === 'ArrowDown' ||
			(event.key === 'Enter' && !selectedFolder.value)
		) {
			showDropdown.value = true;
			const newHighlightedIndex = searchFolders();
			if (newHighlightedIndex !== undefined) {
				highlightedIndex.value = newHighlightedIndex;
			}
			return;
		}
	}

	if (showDropdown.value && searchResults.value.length > 0) {
		handleNavigation(event, searchResults.value, {
			onEnter: (item) => selectFolder(item.folder),
			onEscape: () => {
				showDropdown.value = false;
				searchQuery.value = '';
				resetNavigation();
				folderInput.value?.blur();
			},
			onEmitEnter: () => emit('enterPressed'),
		});
		return;
	}

	if (event.key === 'Enter') {
		if (selectedFolder.value) {
			emit('enterPressed');
		}
	} else if (event.key === 'Escape') {
		showDropdown.value = false;
		searchQuery.value = '';
		resetNavigation();
		folderInput.value?.blur();
	}
};

const handleItemKeydown = (event: KeyboardEvent, item: SearchResultItem) => {
	if (event.key === ' ' && event.shiftKey) {
		event.preventDefault();
		if (item.folder.children && item.folder.children.length > 0) {
			showChildrenFor.value =
				showChildrenFor.value === item.folder.id ? null : item.folder.id;
		}
	}
};

// Watch for external changes to modelValue
watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue && selectedFolder.value?.id !== newValue) {
			const folder = allFolders.value.find((f) => f.id === newValue);
			if (folder) {
				selectedFolder.value = folder;
				searchQuery.value = folder.title; // Show folder name in input
			}
		}
	},
);

onMounted(() => {
	initializeFolders();
	setTimeout(() => {
		folderInput.value?.focus();
	}, 100);
});
</script>

<style scoped>
.folder-selector {
  margin-bottom: 16px;
}

.search-container {
  position: relative;
}

.shortcut-hint {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
  margin-bottom: 4px;
  font-style: italic;
  text-align: center;
  opacity: 0.8;
}

.dropdown-container {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #007AFF;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-item {
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.1s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover,
.dropdown-item.highlighted {
  background-color: #007AFF;
  color: white;
}

.dropdown-item:hover .folder-name,
.dropdown-item.highlighted .folder-name {
  color: white;
  font-weight: 600;
}

.dropdown-item:hover .folder-breadcrumb,
.dropdown-item.highlighted .folder-breadcrumb {
  color: rgba(255, 255, 255, 0.8);
}

.dropdown-item:hover .children-header,
.dropdown-item.highlighted .children-header {
  color: rgba(255, 255, 255, 0.9);
}

.dropdown-item:hover .child-folder,
.dropdown-item.highlighted .child-folder {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.children-count {
  font-size: 11px;
  color: #666;
  margin-left: 4px;
  font-weight: normal;
}

.expand-hint {
  font-size: 12px;
  color: #999;
  margin-left: 6px;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.dropdown-item:hover .children-count,
.dropdown-item.highlighted .children-count {
  color: rgba(255, 255, 255, 0.8);
}

.dropdown-item:hover .expand-hint,
.dropdown-item.highlighted .expand-hint {
  background-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.folder-info {
  padding: 8px 12px;
}

.folder-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.folder-name-section {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.folder-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 0;
}

.folder-icon {
  font-size: 12px;
}

.folder-name {
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.child-indicator {
  font-size: 11px;
  color: #666;
  background: #e9ecef;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: auto;
}

.folder-breadcrumb {
  font-size: 12px;
  color: #666;
  opacity: 0.8;
  margin-left: 18px;
}

.children-list {
  margin-top: 8px;
  margin-left: 18px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 6px;
  max-width: 100%;
  overflow: hidden;
}

.children-header {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}

.children-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.child-folder {
  font-size: 11px;
  color: #555;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.1s;
  border: 1px solid #e9ecef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.child-folder:hover {
  background-color: #007AFF;
  color: white;
  border-color: #0056b3;
}

.dropdown-item:hover .child-folder,
.dropdown-item.highlighted .child-folder {
  background-color: rgba(255, 255, 255, 0.9);
  color: #333;
  border-color: rgba(255, 255, 255, 0.7);
}

.dropdown-item:hover .child-folder:hover,
.dropdown-item.highlighted .child-folder:hover {
  background-color: rgba(255, 255, 255, 1);
  color: #007AFF;
  border-color: #007AFF;
}

.more-children {
  font-size: 11px;
  color: #666;
  font-style: italic;
}

/* Highlighting styles */
.highlight {
  background-color: #ffeb3b;
  color: #333;
  font-weight: 600;
  padding: 1px 2px;
  border-radius: 2px;
}

.dropdown-item.highlighted .highlight,
.dropdown-item:hover .highlight {
  background-color: #fff200;
  color: #000;
  font-weight: 700;
}

/* No results styles */
.no-results {
  padding: 20px;
  text-align: center;
  color: #666;
}

.no-results-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.no-results-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #333;
}

.no-results-hint {
  font-size: 12px;
  color: #999;
}
</style>

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
                  {{ i18n.t('tabToExpand') }}
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
                  @click.stop="selectFolder(child)"
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

interface BookmarkNode {
	id: string;
	title: string;
	url?: string;
	parentId?: string;
	children?: BookmarkNode[];
}

interface BookmarkFolder {
	id: string;
	title: string;
	path: string;
	parentId?: string;
	children?: BookmarkFolder[];
}

interface SearchResultItem {
	folder: BookmarkFolder;
	type: 'match' | 'parent';
}

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

const searchQuery = ref('');
const showDropdown = ref(false);
const folderInput = ref<HTMLInputElement>();
const allFolders = ref<BookmarkFolder[]>([]);
const folderMap = ref<Map<string, BookmarkFolder>>(new Map());
const searchResults = ref<SearchResultItem[]>([]);
const highlightedIndex = ref(-1);
const selectedFolder = ref<BookmarkFolder | null>(null);
const showChildrenFor = ref<string | null>(null);

const buildFolderTree = (
	nodes: BookmarkNode[],
	parentPath = '',
	level = 0,
): BookmarkFolder[] => {
	const folders: BookmarkFolder[] = [];

	for (const node of nodes) {
		if (!node.url) {
			// This is a folder
			const folder: BookmarkFolder = {
				id: node.id,
				title: node.title,
				path: parentPath,
				parentId: node.parentId,
				children: [],
			};

			folders.push(folder);

			if (node.children) {
				const currentPath = parentPath
					? `${parentPath} > ${node.title}`
					: node.title;
				const childFolders = buildFolderTree(
					node.children,
					currentPath,
					level + 1,
				);
				folder.children = childFolders.filter(
					(child) => child.parentId === node.id,
				);
				folders.push(...childFolders);
			}
		}
	}

	return folders;
};

const loadFolders = async () => {
	try {
		const tree = await browser.bookmarks.getTree();
		const folders = buildFolderTree(tree as BookmarkNode[]);

		// Filter out root folders we don't want to show
		allFolders.value = folders.filter(
			(folder) =>
				folder.title !== '' &&
				folder.id !== '0' &&
				folder.title !== 'Bookmarks Menu',
		);

		// Create a map for quick lookup
		folderMap.value.clear();
		for (const folder of allFolders.value) {
			folderMap.value.set(folder.id, folder);
		}

		// Set default to bookmark toolbar if no selection
		if (!props.modelValue) {
			const bookmarkToolbar = allFolders.value.find(
				(f) =>
					f.title === 'Bookmarks Toolbar' ||
					f.title === 'Bookmarks Bar' ||
					f.title === 'Barre de favoris',
			);
			if (bookmarkToolbar) {
				selectedFolder.value = bookmarkToolbar;
				searchQuery.value = bookmarkToolbar.title; // Show folder name in input
				emit('update:modelValue', bookmarkToolbar.id);
				emit('folderSelected', {
					id: bookmarkToolbar.id,
					name: bookmarkToolbar.title,
				});
			}
		}
	} catch (error) {
		console.error('Error loading folders:', error);
	}
};

const searchFolders = () => {
	if (!searchQuery.value.trim()) {
		searchResults.value = [];
		return;
	}

	const query = searchQuery.value.toLowerCase();
	const results: SearchResultItem[] = [];
	const addedIds = new Set<string>();

	for (const folder of allFolders.value) {
		// Only match folder title, not path
		const titleMatch = folder.title.toLowerCase().includes(query);

		if (titleMatch) {
			if (!addedIds.has(folder.id)) {
				// Add the matching folder
				results.push({
					folder,
					type: 'match',
				});
				addedIds.add(folder.id);
			}
		}
	}

	searchResults.value = results.slice(0, 10); // Show more results since no children clutter
	highlightedIndex.value = searchResults.value.length > 0 ? 0 : -1;
};

const highlightText = (text: string, query: string) => {
	if (!query.trim()) return text;

	const regex = new RegExp(
		`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
		'gi',
	);
	return text.replace(regex, '<mark class="highlight">$1</mark>');
};

const scrollToHighlighted = () => {
	setTimeout(() => {
		const highlightedElement = document.querySelector(
			'.dropdown-item.highlighted',
		);
		if (highlightedElement) {
			highlightedElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	}, 0);
};

const onSearchInput = () => {
	searchFolders();
	showDropdown.value = searchQuery.value.trim().length > 0;
};

const onFocus = () => {
	// Clear the input when focused for search
	searchQuery.value = '';
	showDropdown.value = false;
};

const selectFolder = (folder: BookmarkFolder) => {
	selectedFolder.value = folder;
	searchQuery.value = folder.title; // Show folder name in input
	showDropdown.value = false;
	emit('update:modelValue', folder.id);
	emit('folderSelected', { id: folder.id, name: folder.title });
};

const onBlur = () => {
	// Delay hiding dropdown to allow click events
	setTimeout(() => {
		showDropdown.value = false;
		showChildrenFor.value = null;
		// If a folder is selected, restore its name; otherwise clear
		if (!showDropdown.value && selectedFolder.value) {
			searchQuery.value = selectedFolder.value.title;
		} else if (!showDropdown.value) {
			searchQuery.value = '';
		}
	}, 150);
};

const handleKeydown = (event: KeyboardEvent) => {
	if (!showDropdown.value && searchQuery.value.trim()) {
		if (event.key === 'ArrowDown' || event.key === 'Enter') {
			showDropdown.value = true;
			searchFolders();
			return;
		}
	}

	if (showDropdown.value && searchResults.value.length > 0) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			showChildrenFor.value = null; // Hide children when navigating
			highlightedIndex.value = Math.min(
				highlightedIndex.value + 1,
				searchResults.value.length - 1,
			);
			scrollToHighlighted();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			showChildrenFor.value = null; // Hide children when navigating
			highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
			scrollToHighlighted();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			const currentItem = searchResults.value[highlightedIndex.value];
			if (
				currentItem?.folder.children &&
				currentItem.folder.children.length > 0
			) {
				showChildrenFor.value =
					showChildrenFor.value === currentItem.folder.id
						? null
						: currentItem.folder.id;
			}
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (
				highlightedIndex.value >= 0 &&
				searchResults.value[highlightedIndex.value]
			) {
				selectFolder(searchResults.value[highlightedIndex.value].folder);
				return; // Don't emit enterPressed when selecting a folder
			}
			emit('enterPressed');
			return;
		}
	}

	if (event.key === 'Enter') {
		emit('enterPressed');
	} else if (event.key === 'Escape') {
		showDropdown.value = false;
		searchQuery.value = '';
		showChildrenFor.value = null;
		folderInput.value?.blur();
	}
};

const handleItemKeydown = (event: KeyboardEvent, item: SearchResultItem) => {
	if (event.key === 'ArrowRight') {
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
	loadFolders();
	// Auto-focus the folder input when mounted
	setTimeout(() => {
		folderInput.value?.focus();
	}, 100);
});
</script>

<style scoped>
.folder-selector {
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.search-container {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #007AFF;
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
  font-size: 10px;
  color: #999;
  margin-left: auto;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 2px;
  font-style: italic;
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
}

.folder-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.folder-icon {
  font-size: 12px;
}

.folder-name {
  font-weight: 500;
  color: #333;
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

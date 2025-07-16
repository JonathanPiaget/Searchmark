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
          :placeholder="selectedFolder ? selectedFolder.title : i18n.t('searchFolders')"
          @input="onSearchInput"
          @keydown="handleKeydown"
          @focus="onFocus"
          @blur="onBlur"
        >
        <div
          v-if="showDropdown && searchQuery.trim() && searchResults.length > 0"
          class="dropdown-container"
        >
          <div
            v-for="(item, index) in searchResults"
            :key="`${item.type}-${item.folder.id}`"
            :class="['dropdown-item', { highlighted: index === highlightedIndex }, item.type]"
            @mousedown="selectFolder(item.folder)"
            @mouseenter="highlightedIndex = index"
          >
            <div class="folder-info">
              <div class="folder-main">
                <span class="folder-icon">📁</span>
                <span class="folder-name">{{ item.folder.title }}</span>
                <span v-if="item.type === 'child'" class="child-indicator">{{ i18n.t('childOf') }}</span>
              </div>
              <div v-if="item.folder.path" class="folder-breadcrumb">
                {{ item.folder.path }}
              </div>
              <div v-if="item.children && item.children.length > 0" class="children-list">
                <div class="children-header">{{ i18n.t('contains') }}:</div>
                <div class="children-items">
                  <span
                    v-for="child in item.children.slice(0, 3)"
                    :key="child.id"
                    class="child-folder"
                    @click.stop="selectFolder(child)"
                  >
                    📁 {{ child.title }}
                  </span>
                  <span v-if="item.children.length > 3" class="more-children">
                    +{{ item.children.length - 3 }} {{ i18n.t('more') }}
                  </span>
                </div>
              </div>
            </div>
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
	type: 'match' | 'parent' | 'child';
	children?: BookmarkFolder[];
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
		const titleMatch = folder.title.toLowerCase().includes(query);
		const pathMatch = folder.path?.toLowerCase().includes(query);

		if (titleMatch || pathMatch) {
			if (!addedIds.has(folder.id)) {
				// Add the matching folder
				results.push({
					folder,
					type: 'match',
					children: folder.children || [],
				});
				addedIds.add(folder.id);

				// Add child folders as separate items if they exist
				if (folder.children && folder.children.length > 0) {
					for (const child of folder.children.slice(0, 5)) {
						// Limit to 5 children
						if (!addedIds.has(child.id)) {
							results.push({
								folder: child,
								type: 'child',
							});
							addedIds.add(child.id);
						}
					}
				}
			}
		}
	}

	searchResults.value = results.slice(0, 8); // Limit total results
	highlightedIndex.value = searchResults.value.length > 0 ? 0 : -1;
};

const onSearchInput = () => {
	searchFolders();
	showDropdown.value = searchQuery.value.trim().length > 0;
};

const onFocus = () => {
	// Clear the input when focused
	searchQuery.value = '';
	showDropdown.value = false;
};

const selectFolder = (folder: BookmarkFolder) => {
	selectedFolder.value = folder;
	searchQuery.value = ''; // Keep input empty after selection
	showDropdown.value = false;
	emit('update:modelValue', folder.id);
	emit('folderSelected', { id: folder.id, name: folder.title });
};

const onBlur = () => {
	// Delay hiding dropdown to allow click events
	setTimeout(() => {
		showDropdown.value = false;
		// Reset to empty after blur
		if (!showDropdown.value) {
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
			highlightedIndex.value = Math.min(
				highlightedIndex.value + 1,
				searchResults.value.length - 1,
			);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (
				highlightedIndex.value >= 0 &&
				searchResults.value[highlightedIndex.value]
			) {
				selectFolder(searchResults.value[highlightedIndex.value].folder);
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
		folderInput.value?.blur();
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
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 300px;
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

.dropdown-item:hover .child-indicator,
.dropdown-item.highlighted .child-indicator {
  background-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.dropdown-item.child {
  background-color: #fafbfc;
  border-left: 3px solid #e1e5e9;
}

.dropdown-item.child:hover,
.dropdown-item.child.highlighted {
  background-color: #007AFF;
  border-left: 3px solid #0056b3;
}

.folder-info {
  padding: 8px 12px;
}

.folder-main {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
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
  margin-top: 6px;
  margin-left: 18px;
}

.children-header {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}

.children-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.child-folder {
  font-size: 11px;
  color: #555;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.child-folder:hover {
  background-color: #e9ecef;
}

.more-children {
  font-size: 11px;
  color: #666;
  font-style: italic;
}
</style>

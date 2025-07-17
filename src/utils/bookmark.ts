export const getBookmarkToolbarId = async (): Promise<string> => {
	try {
		const [tree] = await browser.bookmarks.getTree();
		return tree.children?.[0]?.id || '1';
	} catch {
		return '1';
	}
};

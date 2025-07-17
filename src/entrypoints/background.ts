export default defineBackground(() => {
	console.log('SearchMark background script loaded');

	const getBookmarkToolbarId = async (): Promise<string> => {
		try {
			const bookmarkTree = await browser.bookmarks.getTree();
			const bookmarkBar = bookmarkTree[0]?.children?.find(
				(child) =>
					child.title === 'Bookmarks bar' ||
					child.title === 'Bookmarks Toolbar',
			);
			return bookmarkBar?.id || '1';
		} catch (error) {
			console.error('Error finding bookmark toolbar:', error);
			return '1';
		}
	};

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.action === 'saveBookmark') {
			(async () => {
				try {
					const toolbarId = await getBookmarkToolbarId();

					await browser.bookmarks.create({
						title: message.title,
						url: message.url,
						parentId: toolbarId,
					});

					sendResponse({ success: true });
				} catch (error) {
					console.error('Error saving bookmark:', error);
					sendResponse({ success: false, error: String(error) });
				}
			})();
			return true; // Indicates that the response will be sent asynchronously
		} else if (message.action === 'openPopup') {
			(async () => {
				try {
					await browser.action.openPopup();
					sendResponse({ success: true });
				} catch (error) {
					console.error('Error opening popup:', error);
					sendResponse({ success: false, error: String(error) });
				}
			})();
			return true; // Indicates that the response will be sent asynchronously
		}
	});
});

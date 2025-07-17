import { getBookmarkToolbarId } from '../utils/bookmark';

export default defineBackground(() => {
	console.log('SearchMark background script loaded');

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

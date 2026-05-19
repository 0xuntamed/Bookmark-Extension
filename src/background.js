import {
  appendSnippet,
  ensureBookmarkForTab,
  openNotesPage
} from "./shared.js";

const MENU_SAVE_SELECTION = "save-selection-to-bookmark-notes";
const MENU_OPEN_PAGE = "open-page-bookmark-notes";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SAVE_SELECTION,
      title: "Save selection to bookmark notes",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: MENU_OPEN_PAGE,
      title: "Open notes for this page",
      contexts: ["page"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleContextMenuClick(info, tab).catch((error) => {
    console.warn("Bookmark Notes:", error);
  });
});

async function handleContextMenuClick(info, tab) {
  const bookmark = await ensureBookmarkForTab(tab);

  if (info.menuItemId === MENU_SAVE_SELECTION) {
    await appendSnippet(bookmark.id, {
      text: info.selectionText,
      sourceTitle: tab.title,
      sourceUrl: tab.url
    });
    await openNotesPage(bookmark.id, "snippets");
    return;
  }

  if (info.menuItemId === MENU_OPEN_PAGE) {
    await openNotesPage(bookmark.id);
  }
}

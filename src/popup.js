import {
  appendSnippet,
  ensureBookmarkForTab,
  findBookmarkByUrl,
  flattenBookmarks,
  getAllNotes,
  getBookmarkTree,
  isBookmarkableUrl,
  openNotesPage
} from "./shared.js";

const MAX_VISIBLE_BOOKMARKS = 150;

const state = {
  activeBookmark: null,
  activeTab: null,
  bookmarks: [],
  notes: {},
  query: ""
};

const elements = {
  bookmarkCount: document.querySelector("#bookmarkCount"),
  bookmarkList: document.querySelector("#bookmarkList"),
  currentNotesButton: document.querySelector("#currentNotesButton"),
  currentPage: document.querySelector("#currentPage"),
  currentTitle: document.querySelector("#currentTitle"),
  currentUrl: document.querySelector("#currentUrl"),
  refreshButton: document.querySelector("#refreshButton"),
  saveSelectionButton: document.querySelector("#saveSelectionButton"),
  searchInput: document.querySelector("#searchInput"),
  statusLine: document.querySelector("#statusLine")
};

init().catch((error) => {
  setStatus(error.message, true);
});

function init() {
  elements.refreshButton.addEventListener("click", refresh);
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderBookmarkList();
  });
  elements.currentNotesButton.addEventListener("click", openCurrentPageNotes);
  elements.saveSelectionButton.addEventListener("click", saveCurrentSelection);
  return refresh();
}

async function refresh() {
  setStatus("Loading");
  const [tree, notes, activeTab] = await Promise.all([
    getBookmarkTree(),
    getAllNotes(),
    getActiveTab()
  ]);

  state.notes = notes;
  state.bookmarks = flattenBookmarks(tree).sort(sortBookmarks);
  state.activeTab = activeTab;
  state.activeBookmark = findBookmarkByUrl(state.bookmarks, activeTab?.url);

  elements.bookmarkCount.textContent = `${state.bookmarks.length} bookmarks`;
  renderCurrentPage();
  renderBookmarkList();
  setStatus("");
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function sortBookmarks(left, right) {
  const leftNote = state.notes[left.id]?.updatedAt || "";
  const rightNote = state.notes[right.id]?.updatedAt || "";
  if (leftNote || rightNote) {
    return rightNote.localeCompare(leftNote);
  }

  return (right.dateAdded || 0) - (left.dateAdded || 0);
}

function renderCurrentPage() {
  const tab = state.activeTab;
  if (!tab?.url) {
    elements.currentPage.hidden = true;
    return;
  }

  const canBookmark = isBookmarkableUrl(tab.url);
  elements.currentPage.hidden = false;
  elements.currentTitle.textContent = state.activeBookmark?.title || tab.title || "Untitled page";
  elements.currentUrl.textContent = tab.url;
  elements.currentNotesButton.textContent = state.activeBookmark ? "Notes" : "Bookmark + notes";
  elements.currentNotesButton.disabled = !canBookmark;
  elements.saveSelectionButton.disabled = !canBookmark;
}

function renderBookmarkList() {
  elements.bookmarkList.replaceChildren();
  const matches = state.bookmarks.filter(matchesQuery);
  const visible = matches.slice(0, MAX_VISIBLE_BOOKMARKS);

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No bookmarks found";
    elements.bookmarkList.append(empty);
    return;
  }

  for (const bookmark of visible) {
    elements.bookmarkList.append(createBookmarkRow(bookmark));
  }

  if (matches.length > visible.length) {
    const capped = document.createElement("div");
    capped.className = "empty-state";
    capped.textContent = `Showing ${visible.length} of ${matches.length}`;
    elements.bookmarkList.append(capped);
  }
}

function createBookmarkRow(bookmark) {
  const row = document.createElement("article");
  row.className = "bookmark-item";

  const copy = document.createElement("div");
  copy.className = "bookmark-copy";

  const title = document.createElement("div");
  title.className = "bookmark-title";
  title.textContent = bookmark.title || bookmark.url;

  const url = document.createElement("div");
  url.className = "bookmark-url";
  url.textContent = bookmark.url;

  const meta = document.createElement("div");
  meta.className = "bookmark-meta";

  if (bookmark.path) {
    const path = document.createElement("span");
    path.textContent = bookmark.path;
    meta.append(path);
  }

  const note = state.notes[bookmark.id];
  if (note?.note || note?.snippets?.length) {
    const chip = document.createElement("span");
    chip.className = "note-chip";
    chip.textContent = `${note.snippets?.length || 0} saved`;
    meta.append(chip);
  }

  copy.append(title, url, meta);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Notes";
  button.addEventListener("click", () => openNotesPage(bookmark.id));

  row.addEventListener("dblclick", () => openNotesPage(bookmark.id));
  row.append(copy, button);
  return row;
}

function matchesQuery(bookmark) {
  if (!state.query) {
    return true;
  }

  const haystack = `${bookmark.title} ${bookmark.url} ${bookmark.path}`.toLowerCase();
  return haystack.includes(state.query);
}

async function openCurrentPageNotes() {
  try {
    setStatus("Opening");
    const bookmark = await ensureBookmarkForTab(state.activeTab);
    await openNotesPage(bookmark.id);
    window.close();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function saveCurrentSelection() {
  try {
    setStatus("Reading selection");
    const selection = await readSelectionFromActiveTab();
    if (!selection) {
      setStatus("Select text on the page first", true);
      return;
    }

    const bookmark = await ensureBookmarkForTab(state.activeTab);
    await appendSnippet(bookmark.id, {
      text: selection,
      sourceTitle: state.activeTab.title,
      sourceUrl: state.activeTab.url
    });
    await openNotesPage(bookmark.id, "snippets");
    window.close();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function readSelectionFromActiveTab() {
  const tabId = state.activeTab?.id;
  if (!tabId) {
    return "";
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => String(window.getSelection?.() || "").trim()
  });

  return String(result?.result || "").trim();
}

function setStatus(message, isWarning = false) {
  elements.statusLine.textContent = message;
  elements.statusLine.classList.toggle("warning", isWarning);
}

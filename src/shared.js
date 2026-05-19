const NOTE_STORE_KEY = "bookmarkNotes";
const BOOKMARKABLE_PROTOCOLS = new Set(["http:", "https:", "file:"]);

function chromeCallback(run) {
  return new Promise((resolve, reject) => {
    run((result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result);
    });
  });
}

export function isBookmarkableUrl(value) {
  try {
    const url = new URL(value);
    return BOOKMARKABLE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function getNotesPageUrl(bookmarkId, focus = "") {
  const params = new URLSearchParams({ id: String(bookmarkId) });
  if (focus) {
    params.set("focus", focus);
  }

  return chrome.runtime.getURL(`src/notes.html?${params.toString()}`);
}

export async function openNotesPage(bookmarkId, focus = "") {
  return chrome.tabs.create({ url: getNotesPageUrl(bookmarkId, focus) });
}

export async function getBookmarkTree() {
  return chromeCallback((done) => chrome.bookmarks.getTree(done));
}

export async function getBookmarkById(bookmarkId) {
  const matches = await chromeCallback((done) => chrome.bookmarks.get(String(bookmarkId), done));
  return matches[0] || null;
}

export function flattenBookmarks(nodes, folderPath = []) {
  const bookmarks = [];

  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        dateAdded: node.dateAdded || 0,
        path: folderPath.join(" / ")
      });
      continue;
    }

    const nextPath = node.title ? [...folderPath, node.title] : folderPath;
    bookmarks.push(...flattenBookmarks(node.children || [], nextPath));
  }

  return bookmarks;
}

export function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;
    return `${url.protocol}//${url.host}${path}${url.search}`;
  } catch {
    return String(value || "").trim();
  }
}

export function findBookmarkByUrl(bookmarks, targetUrl) {
  if (!targetUrl) {
    return null;
  }

  const normalizedTarget = normalizeUrl(targetUrl);
  return bookmarks.find((bookmark) => {
    return bookmark.url === targetUrl || normalizeUrl(bookmark.url) === normalizedTarget;
  }) || null;
}

export async function findBookmarkForUrl(targetUrl) {
  const tree = await getBookmarkTree();
  const bookmarks = flattenBookmarks(tree);
  return findBookmarkByUrl(bookmarks, targetUrl);
}

export async function createBookmarkForUrl(title, url) {
  if (!isBookmarkableUrl(url)) {
    throw new Error("This page cannot be bookmarked by Chrome.");
  }

  return chromeCallback((done) => chrome.bookmarks.create({
    title: title || url,
    url
  }, done));
}

export async function ensureBookmarkForTab(tab) {
  if (!tab?.url) {
    throw new Error("No active page URL was found.");
  }

  const existing = await findBookmarkForUrl(tab.url);
  if (existing) {
    return existing;
  }

  return createBookmarkForUrl(tab.title, tab.url);
}

export async function getAllNotes() {
  const result = await chromeCallback((done) => chrome.storage.local.get({ [NOTE_STORE_KEY]: {} }, done));
  return result[NOTE_STORE_KEY] || {};
}

export async function getBookmarkNote(bookmarkId) {
  const notes = await getAllNotes();
  return normalizeNote(notes[String(bookmarkId)]);
}

export async function savePersonalNote(bookmarkId, noteText) {
  const key = String(bookmarkId);
  const notes = await getAllNotes();
  const existing = normalizeNote(notes[key]);
  notes[key] = {
    ...existing,
    note: noteText,
    updatedAt: new Date().toISOString()
  };

  await chromeCallback((done) => chrome.storage.local.set({ [NOTE_STORE_KEY]: notes }, done));
  return notes[key];
}

export async function appendSnippet(bookmarkId, snippet) {
  const text = String(snippet.text || "").trim();
  if (!text) {
    throw new Error("No selected text was found.");
  }

  const key = String(bookmarkId);
  const notes = await getAllNotes();
  const existing = normalizeNote(notes[key]);
  const now = new Date().toISOString();

  notes[key] = {
    ...existing,
    snippets: [
      {
        id: makeId(),
        text,
        sourceTitle: snippet.sourceTitle || "",
        sourceUrl: snippet.sourceUrl || "",
        createdAt: now
      },
      ...existing.snippets
    ],
    updatedAt: now
  };

  await chromeCallback((done) => chrome.storage.local.set({ [NOTE_STORE_KEY]: notes }, done));
  return notes[key];
}

export async function deleteSnippet(bookmarkId, snippetId) {
  const key = String(bookmarkId);
  const notes = await getAllNotes();
  const existing = normalizeNote(notes[key]);
  notes[key] = {
    ...existing,
    snippets: existing.snippets.filter((snippet) => snippet.id !== snippetId),
    updatedAt: new Date().toISOString()
  };

  await chromeCallback((done) => chrome.storage.local.set({ [NOTE_STORE_KEY]: notes }, done));
  return notes[key];
}

function normalizeNote(note) {
  return {
    note: typeof note?.note === "string" ? note.note : "",
    snippets: Array.isArray(note?.snippets) ? note.snippets : [],
    updatedAt: note?.updatedAt || ""
  };
}

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

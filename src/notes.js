import {
  appendSnippet,
  deleteSnippet,
  getBookmarkById,
  getBookmarkNote,
  savePersonalNote
} from "./shared.js";

const params = new URLSearchParams(location.search);
const bookmarkId = params.get("id");
const focusTarget = params.get("focus");

const state = {
  bookmark: null,
  note: null,
  saveTimer: 0
};

const elements = {
  bookmarkTitle: document.querySelector("#bookmarkTitle"),
  bookmarkUrl: document.querySelector("#bookmarkUrl"),
  copyNotesButton: document.querySelector("#copyNotesButton"),
  openBookmarkButton: document.querySelector("#openBookmarkButton"),
  personalNotes: document.querySelector("#personalNotes"),
  saveState: document.querySelector("#saveState"),
  snippetCount: document.querySelector("#snippetCount"),
  snippetForm: document.querySelector("#snippetForm"),
  snippetInput: document.querySelector("#snippetInput"),
  snippetList: document.querySelector("#snippetList"),
  statusLine: document.querySelector("#statusLine")
};

init().catch((error) => {
  setStatus(error.message, true);
});

async function init() {
  if (!bookmarkId) {
    throw new Error("No bookmark was selected.");
  }

  bindEvents();
  await loadBookmarkNotes();

  if (focusTarget === "snippets") {
    elements.snippetInput.focus();
  } else {
    elements.personalNotes.focus();
  }
}

function bindEvents() {
  elements.personalNotes.addEventListener("input", () => {
    elements.saveState.textContent = "Saving";
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveNotes, 450);
  });

  elements.snippetForm.addEventListener("submit", addManualSnippet);
  elements.openBookmarkButton.addEventListener("click", openBookmark);
  elements.copyNotesButton.addEventListener("click", copyNotes);
}

async function loadBookmarkNotes() {
  const [bookmark, note] = await Promise.all([
    getBookmarkById(bookmarkId).catch(() => null),
    getBookmarkNote(bookmarkId)
  ]);

  state.bookmark = bookmark;
  state.note = note;
  renderBookmark();
  renderNote();
}

function renderBookmark() {
  const title = state.bookmark?.title || "Deleted bookmark";
  const url = state.bookmark?.url || "";

  elements.bookmarkTitle.textContent = title || url || "Untitled bookmark";
  elements.bookmarkUrl.textContent = url || "The original bookmark is not available";
  elements.bookmarkUrl.href = url || "#";
  elements.openBookmarkButton.disabled = !url;
}

function renderNote() {
  elements.personalNotes.value = state.note.note;
  elements.snippetCount.textContent = String(state.note.snippets.length);
  renderSnippets();
}

function renderSnippets() {
  elements.snippetList.replaceChildren();

  if (state.note.snippets.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No saved text yet";
    elements.snippetList.append(empty);
    return;
  }

  for (const snippet of state.note.snippets) {
    elements.snippetList.append(createSnippet(snippet));
  }
}

function createSnippet(snippet) {
  const item = document.createElement("article");
  item.className = "snippet";

  const text = document.createElement("div");
  text.className = "snippet-text";
  text.textContent = snippet.text;

  const footer = document.createElement("div");
  footer.className = "snippet-footer";

  const date = document.createElement("div");
  date.className = "snippet-date";
  date.textContent = formatDate(snippet.createdAt);

  const source = document.createElement("a");
  source.className = "snippet-source";
  source.href = snippet.sourceUrl || state.bookmark?.url || "#";
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = snippet.sourceTitle || snippet.sourceUrl || "Source";

  const actions = document.createElement("div");
  actions.className = "snippet-actions";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy";
  copy.addEventListener("click", () => copyText(snippet.text));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "danger";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => removeSnippet(snippet.id));

  actions.append(copy, remove);
  footer.append(date, source, actions);
  item.append(text, footer);
  return item;
}

async function saveNotes() {
  try {
    state.note = await savePersonalNote(bookmarkId, elements.personalNotes.value);
    elements.saveState.textContent = "Saved";
  } catch (error) {
    elements.saveState.textContent = "Not saved";
    setStatus(error.message, true);
  }
}

async function addManualSnippet(event) {
  event.preventDefault();
  const text = elements.snippetInput.value.trim();
  if (!text) {
    setStatus("Paste text first", true);
    return;
  }

  try {
    state.note = await appendSnippet(bookmarkId, {
      text,
      sourceTitle: state.bookmark?.title || "",
      sourceUrl: state.bookmark?.url || ""
    });
    elements.snippetInput.value = "";
    elements.snippetCount.textContent = String(state.note.snippets.length);
    renderSnippets();
    setStatus("Saved");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function removeSnippet(snippetId) {
  try {
    state.note = await deleteSnippet(bookmarkId, snippetId);
    elements.snippetCount.textContent = String(state.note.snippets.length);
    renderSnippets();
    setStatus("Deleted");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function openBookmark() {
  if (state.bookmark?.url) {
    chrome.tabs.create({ url: state.bookmark.url });
  }
}

async function copyNotes() {
  const pieces = [elements.personalNotes.value.trim()];
  for (const snippet of state.note.snippets) {
    pieces.push(snippet.text);
  }

  await copyText(pieces.filter(Boolean).join("\n\n"));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function setStatus(message, isWarning = false) {
  elements.statusLine.textContent = message;
  elements.statusLine.classList.toggle("warning", isWarning);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

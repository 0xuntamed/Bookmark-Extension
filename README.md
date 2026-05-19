
Bookmark Notes is a Chrome extension for managing your bookmarks with personal notes. Each bookmark gets its own dedicated notes page, so you can save thoughts, copied text, research snippets, reminders, or anything important from that page.

## What It Does

- Shows your Chrome bookmarks in a searchable popup.
- Opens a separate notes page for each bookmark.
- Lets you write long personal notes for a bookmark.
- Lets you paste important text manually.
- Lets you save highlighted text from a webpage directly into that bookmark's notes.
- Automatically creates a bookmark for the current page when needed.
- Stores notes locally in Chrome using `chrome.storage.local`.

## Install In Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on Developer mode in the top-right corner.
4. Click Load unpacked.
5. Select this folder:

```text
C:\Users\THALHA AHMED\Documents\Bookmark Extension
```

6. Pin the Bookmark Notes extension from the Chrome extensions menu if you want quick access.

## How To Use

### Open Your Bookmarks

1. Click the Bookmark Notes extension icon in Chrome.
2. Search for a bookmark by title, URL, or folder name.
3. Click Notes beside a bookmark.
4. A dedicated notes page opens for that bookmark.

### Write Personal Notes

1. Open a bookmark's notes page.
2. Write in the Personal notes area.
3. Your text saves automatically after you stop typing.

Use this area for your own thoughts, summaries, todos, or anything you want to remember about that bookmark.

### Save Important Text Manually

1. Open a bookmark's notes page.
2. Paste text into the Saved text box.
3. Click Add text.
4. The text appears as a saved snippet for that bookmark.

### Save Highlighted Text From A Webpage

1. Open any webpage.
2. Highlight the text you want to save.
3. Right-click the highlighted text.
4. Click Save selection to bookmark notes.
5. The extension opens the notes page and saves the selected text.

If the page is not already bookmarked, the extension creates a bookmark for it first.

### Save Selected Text From The Popup

1. Highlight text on the current webpage.
2. Click the Bookmark Notes extension icon.
3. Click Save selection under Current page.
4. The selected text is saved into that page's bookmark notes.

### Create Notes For The Current Page

1. Click the Bookmark Notes extension icon.
2. In the Current page section, click Bookmark + notes.
3. If the page is not bookmarked yet, it will be added to your Chrome bookmarks.
4. The dedicated notes page opens.

## Notes Storage

Notes are stored locally in Chrome using `chrome.storage.local`.

The data is saved by Chrome bookmark ID. This means:

- Each bookmark has its own notes.
- Deleting a Chrome bookmark does not automatically delete the stored note.
- Recreating the same bookmark later may create a new bookmark ID, so it may not reconnect to the old note automatically.

## Permissions Used

The extension asks for these Chrome permissions:

- `bookmarks`: read your bookmarks and create a bookmark for the current page when needed.
- `storage`: save your notes and snippets.
- `contextMenus`: add the right-click save option.
- `activeTab`, `tabs`, `scripting`: read the selected text from the current tab when you choose to save it.

## Troubleshooting

If the extension does not appear, go to `chrome://extensions` and make sure it is enabled.

If selected text is not saved, make sure you selected text on the page before clicking Save selection.

If you change the code, go to `chrome://extensions` and click the reload button on the extension card.

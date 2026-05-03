# HNG Stage 4A AI Page Summarizer - Chrome Extension

A Chrome Extension that extracts content from any webpage and generates a structured AI-powered summary with key insights and estimated reading time.

---

## Demo

[Link to demo video](https://drive.google.com/file/d/1pPRN3oryREKV7bYM_ljBsTtDp8YrI4s6/view?usp=sharing)

---

## Features

- **One-click Summarization**: Extract and summarize any article with a single click
- **AI-Powered**: Uses Google Gemini API for intelligent content summarization
- **Smart Content Extraction**: Identifies main article content, ignoring navigation and sidebars
- **Key Insights**: Highlights the most important takeaways
- **Reading Time**: Estimates how long the article takes to read
- **Summary Caching**: Caches summaries per URL to prevent duplicate API calls
- **Customizable**: Configure summary length (Brief/Standard/Detailed) and tone
- **Secure**: API keys stored locally, never exposed or transmitted
- **Keyboard Accessible**: Full keyboard navigation with visible focus states

---

## Tech Stack

- **JavaScript** (Vanilla)
- **HTML/CSS**
- **Chrome Extensions API** (Manifest V3)
- **Google Gemini API** (AI summarization)
- **chrome.storage.local** (caching and settings persistence)

---

## Installation

### Prerequisites

- Google Chrome browser
- A Google Gemini API key (free - get one at [Google AI Studio](https://aistudio.google.com/app/apikey))

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/iibrahimx/hng-stage4a-ai-page-summarizer.git
   cd hng-stage4a-ai-page-summarizer
   ```

   Or download as ZIP and extract to a folder.

2. **Open Chrome Extensions page**

- Navigate to `chrome://extensions/` in your Chrome browser
- Enable **Developer mode** (toggle in the top-right corner)

3. **Load the extension**

- Click **Load unpacked**
- Select the project folder (`hng-stage4a-ai-page-summarizer`)
- The extension icon should appear in your toolbar

4. **Pin the extension (optional)**

- Click the puzzle piece icon (Extensions menu) in the toolbar
- Find "AI Page Summarizer" and click the pin icon
- The extension icon will now appear directly in your toolbar

5. **Configure your API key**

- Click the extension icon in the toolbar
- Click ⚙️ **Settings** to expand the settings panel
- Paste your Gemini API key
- Select your preferred summary length and tone
- Click **Save Settings**

6. **Start summarizing**

- Navigate to any article or webpage
- Click the extension icon
- Click **Summarize Page**

---

## Project Structure

```text
hng-stage4a-ai-page-summarizer/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup/
│   ├── popup.html         # Popup UI structure
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic & state management, settings
├── scripts/
│   ├── content.js         # Page content extraction engine
│   └── background.js      # Service worker & API integration, caching
├── assets/
│   └── icons/             # Extension icons (16px, 48px, 128px)
└── README.md
```

---

## Architecture

### Component Communication

```text
┌─────────┐    chrome.runtime.sendMessage    ┌────────────┐
│  Popup  │ ──────────────────────────────>  │ Background │
│  (UI)   │ <──────────────────────────────  │  (Service  │
└─────────┘    sendResponse                  │   Worker)  │
                                             └─────┬──────┘
                                                   │
                                    chrome.tabs    │
                                    .sendMessage   │
                                                   │
                                             ┌─────┴──────┐
                                             │  Content   │
                                             │  Script    │
                                             └────────────┘
```

1. **Popup** sends a summarize request to the Background Service Worker
2. **Background** requests page content from the Content Script
3. **Content Script** extracts the main article text and returns it
4. **Background** calls the Gemini API (or returns cached/mock result)
5. **Popup** displays the formatted summary

### Key Design Decisions

| Decision                                   | Reasoning                                                    |
| :----------------------------------------- | :----------------------------------------------------------- |
| **Manifest V3**                            | Required by Chrome; V2 is deprecated                         |
| **Background Service Worker**              | Isolated environment for secure API calls                    |
| **Content Script (declarative injection)** | Automatically runs on all pages without scripting permission |
| **`chrome.storage.local` for caching**     | Persists summaries per URL across sessions                   |
| **Settings in popup (no options page)**    | Simpler UX; all functionality in one place                   |
| **Vanilla JavaScript**                     | No framework overhead; fast loading                          |

---

## AI Integration

This extension uses the **Google Gemini API** (`gemini-3-flash-preview` model) for text summarization.

### How It Works

1. Content is extracted from the webpage using semantic HTML detection and heuristic filtering
2. A structured prompt is built with user preferences (summary length, tone)
3. The prompt and content are sent to the Gemini API via HTTPS
4. The AI returns a formatted HTML summary with Key Insights and bullet points
5. The summary is displayed and cached for future visits

---

## Prompt Engineering

The AI prompt uses a structured template:

- **Role assignment:** "You are a professional content summarizer"
- **Clear input delimitation:** Content is wrapped in `"""` markers
- **Numbered, specific instructions:** Controls output format and behavior
- **Output format specification:** Requires HTML with `<h3>`, `<ul>`, `<li>` tags
- **Negative constraints:** Explicitly forbids introductory text and markdown blocks
- **Temperature setting:** 0.3 for factual, consistent outputs

---

## Content Extraction Strategy

The extension uses a tiered approach to find the main article content:

1. **Semantic HTML detection:** Searches for `<article>`, `[role="main"]`, and common content class names (`.post-content`, `.article-content`, `.entry-content`)
2. **Heuristic fallback:** If no semantic elements are found, clones the body, removes non-content elements (nav, footer, sidebar, ads), and scores remaining elements by text density
3. **Body fallback:** If all else fails, extracts from the full body after cleaning
4. **Non-content elements removed include:** navigation, headers, footers, sidebars, advertisements, social sharing buttons, comments, scripts, and styles.

---

## Local Storage Structure

This extension uses chrome.storage.local for all data persistence.

### Storage Keys

| Key               | Purpose               | Data Stored                                   |
| :---------------- | :-------------------- | :-------------------------------------------- |
| **api_key**       | User's Gemini API key | String (encrypted at rest by Chrome)          |
| **user_settings** | User preferences      | Object: `{ summaryLength, tone }`             |
| **[page_url]**    | Cached summaries      | Object: `{ summary, readingTime, timestamp }` |

---

## How It Works

- **API Key:** Entered via settings panel, stored on save, loaded on popup open
- **Settings:** Persist across browser restarts, loaded on each popup open
- **Caching:** Each unique URL gets its own storage key. When a user revisits a previously summarized page, the cached summary is displayed instantly without making a new API call
- **Cache Clearing:** The "Clear Cache" button removes all cached summaries while preserving settings and API key

---

## Security Decisions

| Decision                                      | Reasoning                                                    |
| :-------------------------------------------- | :----------------------------------------------------------- |
| API key stored in `chrome.storage.local`      | Never exposed to web pages, only accessible by extension     |
| API calls from Background Service Worker      | Isolated environment, not accessible to content scripts      |
| Minimal permissions (`activeTab`, `storage`)  | Only access current tab on user action, no broad permissions |
| `type="password"` for API key input           | Prevents visual exposure of the key                          |
| `.gitignore` for environment files            | Prevents accidental secret commits                           |
| No external dependencies                      | Reduces supply chain attack surface                          |
| `rel="noopener noreferrer"` on external links | Prevents tab hijacking                                       |

---

## Trade-offs

| Trade-off                   | Choice                        | Impact                                                      |
| :-------------------------- | :---------------------------- | :---------------------------------------------------------- |
| Content extraction approach | Combined semantic + heuristic | Works on most sites but may miss content on unusual layouts |
| API provider                | Gemini (free tier)            | No cost but has rate limits; users can use their own key    |
| Summary length limit        | 6000 characters max input     | Handles most articles but very long pages are truncated     |
| No framework                | Vanilla JavaScript            | Lightweight and fast but more verbose code                  |
| Popup-only UI               | No options page               | Simpler architecture but all settings in popup              |

---

## Technical Details

- Manifest Version: V3
- Browser Support: Chrome 88+
- API: Google Gemini (https://generativelanguage.googleapis.com)
- Storage: chrome.storage.local for caching and settings
- Content Extraction: Semantic HTML detection with heuristic fallback
- Reading Speed: 225 words per minute (industry standard)

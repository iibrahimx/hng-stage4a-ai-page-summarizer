# HNG Stage 4A AI Page Summarizer - Chrome Extension

A Chrome Extension that extracts content from any webpage and generates a structured AI-powered summary with key insights and estimated reading time. Works out of the box, no API keys or configuration required.

---

## Demo

[Link to demo video](https://drive.google.com/file/d/1pPRN3oryREKV7bYM_ljBsTtDp8YrI4s6/view?usp=sharing)

---

## Features

- **One-click Summarization**: Extract and summarize any article with a single click
- **Plug-and-Play**: No API keys needed - works immediately after installation
- **AI-Powered**: Uses Groq's Llama 3.1 model via a secure proxy server
- **Smart Content Extraction**: Identifies main article content, ignoring navigation and sidebars
- **Key Insights**: Highlights the most important takeaways
- **Reading Time**: Estimates how long the article takes to read
- **Summary Caching**: Caches summaries per URL to prevent duplicate API calls
- **Customizable**: Configure summary length (Brief/Standard/Detailed) and tone (Concise/Detailed/Simple)
- **Keyboard Accessible**: Full keyboard navigation with visible focus states

---

## Tech Stack

- **JavaScript** (Vanilla)
- **HTML/CSS**
- **Chrome Extensions API** (Manifest V3)
- **Google Gemini API** (AI summarization)
- **Vercel Serverless Functions** (secure API proxy)
- **chrome.storage.local** (caching and settings persistence)

---

## Installation

### Prerequisites

- Google Chrome browser

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

5. **Configure the summarizer (optional)**

- Click the extension icon in the toolbar
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
├── api/
│   └── summarize.js       # Serverless proxy function (holds API key securely)
├── popup/
│   ├── popup.html         # Popup UI structure
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic & state management
├── scripts/
│   ├── content.js         # Page content extraction engine
│   └── background.js      # Service worker & proxy communication
├── assets/
│   └── icons/             # Extension icons (16px, 48px, 128px)
├── manifest.json          # Extension configuration (Manifest V3)
├── vercel.json            # Vercel deployment configuration
└── README.md
```

---

## Architecture

### Component Communication

```text
┌─────────┐    chrome.runtime.sendMessage    ┌────────────┐    HTTPS    ┌─────────┐
│  Popup  │ ──────────────────────────────>  │ Background │ ─────────>  │ Vercel  │
│  (UI)   │ <──────────────────────────────  │  (Service  │ <─────────  │  Proxy  │
└─────────┘    sendResponse                  │   Worker)  │             └────┬────┘
                                             └─────┬──────┘                  │
                                                   │                         │
                                      chrome.tabs  │                 Groq API│
                                     .sendMessage  │                         │
                                                   │                  ┌──────┴──────┐
                                             ┌─────┴──────┐           │  Groq Cloud │
                                             │  Content   │           │  (Llama 3)  │
                                             │  Script    │           └─────────────┘
                                             └────────────┘
```

1. **Popup** sends a summarize request to the Background Service Worker
2. **Background** requests page content from the Content Script
3. **Content Script** extracts the main article text and returns it
4. **Background** sends content to the **Vercel Proxy Server**
5. **Vercel Proxy** calls the **Groq API** using the server-side API key
6. **Popup** displays the formatted summary

### Key Design Decisions

| Decision                                   | Reasoning                                                    |
| :----------------------------------------- | :----------------------------------------------------------- |
| **Manifest V3**                            | Required by Chrome; V2 is deprecated                         |
| **Background Service Worker**              | Isolated environment for secure API calls                    |
| **Serverless Proxy (Vercel)**              | API key stored on server, never exposed to client or GitHub  |
| **Content Script (declarative injection)** | Automatically runs on all pages without scripting permission |
| **`chrome.storage.local` for caching**     | Persists summaries per URL across sessions                   |
| **Settings in popup**                      | Simpler UX; all functionality in one place                   |
| **Vanilla JavaScript**                     | Zero dependencies; fast loading; no framework overhead       |

---

## AI Integration

This extension uses **Groq's Llama 3.1 8B Instant** model via a secure Vercel serverless proxy.

### How It Works

1. Content is extracted from the webpage using semantic HTML detection and heuristic filtering
2. A structured prompt is built incorporating user preferences (summary length, tone)
3. The content and settings are sent to the Vercel proxy server
4. The proxy forwards the request to Groq API with the server-side API key
5. The AI returns a formatted HTML summary with Key Insights and bullet points
6. The summary is displayed and cached for future visits

---

## Why a Proxy Server?

- Security: The API key lives only on Vercel's servers, never in extension code or on GitHub
- User Experience: No API key setup required - works immediately after installation
- Reliability: Groq's free tier has generous rate limits for smooth operation

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
4. **Filtered elements include:** navigation, headers, footers, sidebars, advertisements, social sharing buttons, comments, scripts, and styles.

---

## Local Storage Structure

This extension uses chrome.storage.local for all data persistence.

### Storage Keys

| Key               | Purpose          | Data Stored                                   |
| :---------------- | :--------------- | :-------------------------------------------- |
| **user_settings** | User preferences | Object: `{ summaryLength, tone }`             |
| **[page_url]**    | Cached summaries | Object: `{ summary, readingTime, timestamp }` |

- **Settings:** Persist across browser restarts, loaded on each popup open
- **Caching:** Each unique URL gets its own storage key for instant retrieval on revisit
- **Cache Clearing:** The "Clear Cache" button removes all cached summaries while preserving settings

---

## Security Decisions

| Decision                                      | Reasoning                                                    |
| :-------------------------------------------- | :----------------------------------------------------------- |
| API key stored on Vercel server only          | Never in extension code, never on GitHub, never in browser   |
| Proxy server architecture                     | Client never sees or handles API keys                        |
| API calls from Background Service Worker      | Isolated environment, not accessible to content scripts      |
| Minimal permissions (`activeTab`, `storage`)  | Only access current tab on user action, no broad permissions |
| `.gitignore` for environment files            | Prevents accidental secret commits                           |
| No external dependencies                      | Reduces supply chain attack surface                          |
| `rel="noopener noreferrer"` on external links | Prevents tab hijacking                                       |

---

## Trade-offs

| Trade-off                   | Choice                        | Impact                                                      |
| :-------------------------- | :---------------------------- | :---------------------------------------------------------- |
| Content extraction approach | Combined semantic + heuristic | Works on most sites but may miss content on unusual layouts |
| API architecture            | Serverless proxy (Vercel)     | Adds network hop but keeps API key secure                   |
| Summary length limit        | 6000 characters max input     | Handles most articles but very long pages are truncated     |
| No framework                | Vanilla JavaScript            | Lightweight and fast but more verbose code                  |
| Popup-only UI               | No options page               | Simpler architecture but all settings in popup              |

---

## Technical Details

- Manifest Version: V3
- Browser Support: Chrome 88+
- API Model: Groq Llama 3.1 8B Instant
- Proxy: Vercel Serverless Functions
- Storage: chrome.storage.local for caching and settings
- Content Extraction: Semantic HTML detection with heuristic fallback
- Reading Speed: 225 words per minute (industry standard)

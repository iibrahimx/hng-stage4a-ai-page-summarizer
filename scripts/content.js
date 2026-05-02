// Content extraction from webpage

function extractPageContent() {
  const articleSelectors = [
    "article",
    '[role="main"]',
    ".post-content",
    ".article-content",
    ".entry-content",
    ".content-body",
    "main",
    "#content",
    ".post-body",
  ];

  let contentElement = null;

  for (const selector of articleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 200) {
      contentElement = element;
      break;
    }
  }

  if (!contentElement) {
    contentElement = findMainContentByHeuristics();
  }

  if (!contentElement) {
    contentElement = document.body;
  }

  const cleanContent = extractCleanText(contentElement);
  const readingTime = calculateReadingTime(cleanContent);

  return {
    title: document.title,
    url: window.location.href,
    content: cleanContent,
    readingTime: readingTime,
  };
}

function findMainContentByHeuristics() {
  const excludeSelectors = [
    "nav",
    "header",
    "footer",
    "aside",
    ".nav",
    ".navbar",
    ".navigation",
    ".header",
    ".footer",
    ".sidebar",
    ".menu",
    ".comments",
    ".advertisement",
    ".social",
    ".share",
    ".related-posts",
    "script",
    "style",
    "noscript",
  ];

  const bodyClone = document.body.cloneNode(true);

  excludeSelectors.forEach((selector) => {
    const elements = bodyClone.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  const candidates = bodyClone.querySelectorAll("div, section, main, article");
  let bestElement = null;
  let maxTextLength = 0;

  candidates.forEach((element) => {
    const textLength = element.textContent.trim().length;
    const childElementCount = element.querySelectorAll("*").length;
    const score = textLength - childElementCount * 10;

    if (score > maxTextLength && textLength > 500) {
      maxTextLength = score;
      bestElement = element;
    }
  });

  return bestElement;
}

function extractCleanText(element) {
  const clone = element.cloneNode(true);

  const removeSelectors = [
    "script",
    "style",
    "noscript",
    "iframe",
    "nav",
    ".nav",
    ".navigation",
    ".social",
    ".share",
    ".sharing",
    ".comments",
    "#comments",
    ".advertisement",
    ".ad",
    ".ads",
    "button",
    ".button",
    "img",
    "svg",
    "video",
    "audio",
  ];

  removeSelectors.forEach((selector) => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  let text = clone.textContent || "";

  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .trim();

  const maxLength = 8000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + "...";
  }

  return text;
}

function calculateReadingTime(text) {
  const wordsPerMinute = 225;
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes || 1;
}

// Listen for extraction requests from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractContent") {
    try {
      const pageData = extractPageContent();
      sendResponse({ success: true, data: pageData });
    } catch (error) {
      sendResponse({
        success: false,
        error: "Failed to extract page content",
      });
    }
  }
  return true;
});

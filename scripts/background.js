// === CONFIGURATION ===
// Actual Vercel URL after deployment
const PROXY_URL = "https://YOUR_VERCEL_APP.vercel.app/api/summarize";

const STORAGE_KEYS = {
  SETTINGS: "user_settings",
};

const DEFAULT_SETTINGS = {
  summaryLength: "standard",
  tone: "concise",
};

// === MAIN HANDLER ===
async function handleSummarization(tabId) {
  var settingsResult = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  var settings = settingsResult[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;

  // Get page content from content script
  var pageData;
  try {
    var response = await chrome.tabs.sendMessage(tabId, {
      action: "extractContent",
    });
    if (!response || !response.success) {
      return {
        error:
          "Failed to extract content from this page. Try a different page.",
      };
    }
    pageData = response.data;
  } catch (error) {
    return {
      error: "Could not access page content. Make sure you are on a webpage.",
    };
  }

  if (!pageData.content || pageData.content.length < 100) {
    return { error: "Not enough content found on this page to summarize." };
  }

  // Call the proxy server
  try {
    var apiResponse = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: pageData.content,
        settings: settings,
      }),
    });

    if (!apiResponse.ok) {
      var errorData = await apiResponse.json();
      throw new Error(errorData.error || "Server error: " + apiResponse.status);
    }

    var data = await apiResponse.json();

    return {
      summary: data.summary,
      readingTime: pageData.readingTime,
    };
  } catch (error) {
    return { error: "Summarization failed: " + error.message };
  }
}

// === MESSAGE LISTENER ===
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "summarize") {
    handleSummarization(message.tabId)
      .then(function (result) {
        sendResponse(result);
      })
      .catch(function (error) {
        sendResponse({ error: "Unexpected error: " + error.message });
      });
    return true;
  }
});

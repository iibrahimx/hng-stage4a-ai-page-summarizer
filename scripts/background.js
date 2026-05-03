// === CONFIGURATION ===
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const STORAGE_KEYS = {
  API_KEY: "api_key",
  SETTINGS: "user_settings",
};

const DEFAULT_SETTINGS = {
  summaryLength: "standard",
  tone: "concise",
};

// === GET API KEY ===
async function getApiKey() {
  var result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY]);
  return result[STORAGE_KEYS.API_KEY] || null;
}

// === BUILD PROMPT ===
function buildPrompt(content, settings) {
  var lengthGuide = {
    brief: "exactly 3 bullet points",
    standard: "exactly 5 bullet points",
    detailed: "exactly 8 bullet points",
  };

  var toneGuide = {
    concise: "Be direct and to the point. Use short, clear sentences.",
    detailed: "Include key details and supporting context in each point.",
    simple:
      "Use simple, easy-to-understand language suitable for a general audience.",
  };

  return (
    "You are a professional content summarizer. Your task is to summarize the following webpage content.\n\n" +
    'CONTENT TO SUMMARIZE:\n"""\n' +
    content.substring(0, 6000) +
    '\n"""\n\n' +
    "IMPORTANT INSTRUCTIONS - FOLLOW THESE EXACTLY:\n\n" +
    '1. First, create a "Key Insights" section with 2-3 important takeaways from the content.\n' +
    '2. Then, create a "Summary" section with ' +
    lengthGuide[settings.summaryLength] +
    ".\n" +
    "3. " +
    toneGuide[settings.tone] +
    "\n" +
    "4. Each bullet point must be a complete, meaningful sentence.\n" +
    "5. You MUST include BOTH sections: Key Insights AND Summary.\n\n" +
    "FORMAT YOUR ENTIRE RESPONSE EXACTLY LIKE THIS:\n" +
    "<h3>Key Insights</h3>\n" +
    "<ul>\n" +
    "  <li>First key insight here</li>\n" +
    "  <li>Second key insight here</li>\n" +
    "  <li>Third key insight here</li>\n" +
    "</ul>\n" +
    "<h3>Summary</h3>\n" +
    "<ul>\n" +
    "  <li>Summary point 1</li>\n" +
    "  <li>Summary point 2</li>\n" +
    "  <li>Summary point 3</li>\n" +
    "</ul>\n\n" +
    "RULES:\n" +
    "- Do NOT include any text before the first <h3> tag.\n" +
    '- Do NOT say "Here is a summary" or similar introductions.\n' +
    "- Do NOT wrap your response in markdown code blocks.\n" +
    "- ONLY output the HTML tags and content shown in the format above."
  );
}

// === CALL API ===
async function callAPI(apiKey, content, settings) {
  var prompt = buildPrompt(content, settings);

  var requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
    },
  };

  var response = await fetch(API_URL + "?key=" + apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    var errorData = await response.json();
    throw new Error(
      errorData.error?.message || "API error: " + response.status,
    );
  }

  var data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// === MAIN HANDLER ===
async function handleSummarization(tabId) {
  var apiKey = await getApiKey();

  if (!apiKey) {
    return {
      error:
        "No API key configured. Please add your Gemini API key in Settings.",
    };
  }

  var settingsResult = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  var settings = settingsResult[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;

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

  try {
    var summary = await callAPI(apiKey, pageData.content, settings);
    return {
      summary: summary,
      readingTime: pageData.readingTime,
    };
  } catch (error) {
    return { error: "AI API error: " + error.message };
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

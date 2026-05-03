// AI API Configuration
const AI_PROVIDER = "gemini";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const STORAGE_KEYS = {
  API_KEY: "api_key",
  SETTINGS: "user_settings",
};

const DEFAULT_SETTINGS = {
  summaryLength: "standard",
  tone: "concise",
};

async function getApiKey() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY]);
  return result[STORAGE_KEYS.API_KEY] || null;
}

function buildPrompt(content, settings) {
  const lengthGuide = {
    brief: "Provide exactly 3 bullet points.",
    standard: "Provide exactly 5 bullet points.",
    detailed: "Provide exactly 8 bullet points.",
  };

  const toneGuide = {
    concise: "Be direct and to the point.",
    detailed: "Include key details and context.",
    simple: "Use simple, easy-to-understand language.",
  };

  return `You are a professional content summarizer. Analyze the following webpage content and provide a structured summary.

CONTENT TO SUMMARIZE:
"""
${content}
"""

INSTRUCTIONS:
1. ${lengthGuide[settings.summaryLength]}
2. Each bullet point should be a complete, meaningful insight.
3. Start with a "Key Insights" section (2-3 important takeaways).
4. ${toneGuide[settings.tone]}
5. Format the summary in clean HTML using <h3>, <ul>, and <li> tags.
6. Do NOT include any introductory text like "Here is a summary".
7. Do NOT wrap the response in markdown code blocks.

Your response should be structured exactly like this:
<h3>Key Insights</h3>
<ul>
<li>Important takeaway 1</li>
<li>Important takeaway 2</li>
</ul>
<h3>Summary</h3>
<ul>
<li>Bullet point 1</li>
<li>Bullet point 2</li>
</ul>`;
}

async function callGeminiAPI(apiKey, content, settings) {
  const prompt = buildPrompt(content, settings);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || `API error: ${response.status}`,
    );
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAIAPI(apiKey, content, settings) {
  const prompt = buildPrompt(content, settings);

  const requestBody = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a professional content summarizer. Always respond with clean HTML.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  };

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || `API error: ${response.status}`,
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleSummarization(tabId) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return {
      error:
        "No API key configured. Please add your API key in the extension settings.",
    };
  }

  const settingsResult = await chrome.storage.local.get([
    STORAGE_KEYS.SETTINGS,
  ]);
  const settings = settingsResult[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;

  let pageData;
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "extractContent",
    });
    if (!response || !response.success) {
      return { error: "Failed to extract content from this page." };
    }
    pageData = response.data;
  } catch (error) {
    return {
      error: "Could not access page content. Make sure you are on a webpage.",
    };
  }

  if (!pageData.content || pageData.content.length < 100) {
    return {
      error: "Not enough content found on this page to summarize.",
    };
  }

  try {
    let summary;
    if (AI_PROVIDER === "gemini") {
      summary = await callGeminiAPI(apiKey, pageData.content, settings);
    } else {
      summary = await callOpenAIAPI(apiKey, pageData.content, settings);
    }

    return {
      summary: summary,
      readingTime: pageData.readingTime,
    };
  } catch (error) {
    return {
      error: `AI API error: ${error.message}`,
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "summarize") {
    handleSummarization(message.tabId)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          error: `Unexpected error: ${error.message}`,
        });
      });

    return true;
  }
});

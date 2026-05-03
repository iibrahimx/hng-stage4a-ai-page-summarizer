// DOM Elements
const pageTitleEl = document.getElementById("pageTitle");
const summarizeBtn = document.getElementById("summarizeBtn");
const clearBtn = document.getElementById("clearBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const readingTimeEl = document.getElementById("readingTime");
const summaryOutput = document.getElementById("summaryOutput");
const errorContainer = document.getElementById("errorContainer");
const errorMessage = document.getElementById("errorMessage");

// Get current tab information when popup opens
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function displayPageTitle() {
  try {
    const tab = await getCurrentTab();
    pageTitleEl.textContent = tab.title || "Unknown Page";
  } catch (error) {
    pageTitleEl.textContent = "Could not get page title";
  }
}

// UI State Management
function setLoadingState(isLoading) {
  if (isLoading) {
    btnText.textContent = "Summarizing...";
    btnSpinner.classList.remove("hidden");
    summarizeBtn.disabled = true;
    errorContainer.classList.add("hidden");
    summaryOutput.innerHTML = "";
    readingTimeEl.classList.add("hidden");
  } else {
    btnText.textContent = "Summarize Page";
    btnSpinner.classList.add("hidden");
    summarizeBtn.disabled = false;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorContainer.classList.remove("hidden");
  summaryOutput.innerHTML = "";
  readingTimeEl.classList.add("hidden");
}

function showSummary(summaryText, readingTime) {
  summaryOutput.innerHTML = summaryText;
  readingTimeEl.textContent = `Estimated reading time: ${readingTime} min`;
  readingTimeEl.classList.remove("hidden");
  errorContainer.classList.add("hidden");
}

function clearSummary() {
  summaryOutput.innerHTML = "";
  readingTimeEl.classList.add("hidden");
  errorContainer.classList.add("hidden");
}

// Handle Summarize button click
summarizeBtn.addEventListener("click", async () => {
  setLoadingState(true);

  try {
    const tab = await getCurrentTab();
    const url = tab.url;

    // Check if summary is cached
    const cached = await chrome.storage.local.get([url]);
    if (cached[url]) {
      showSummary(cached[url].summary, cached[url].readingTime);
      setLoadingState(false);
      return;
    }

    // Send message to background to initiate summarization
    const response = await chrome.runtime.sendMessage({
      action: "summarize",
      tabId: tab.id,
    });

    if (response.error) {
      showError(response.error);
    } else {
      showSummary(response.summary, response.readingTime);

      // Cache the result
      await chrome.storage.local.set({
        [url]: {
          summary: response.summary,
          readingTime: response.readingTime,
          timestamp: Date.now(),
        },
      });
    }
  } catch (error) {
    showError("Failed to summarize page. Please try again.");
  } finally {
    setLoadingState(false);
  }
});

// Handle Clear button click
clearBtn.addEventListener("click", () => {
  clearSummary();
});

// Settings functionality
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const toggleIcon = document.getElementById("toggleIcon");
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleVisibilityBtn = document.getElementById("toggleVisibilityBtn");
const summaryLength = document.getElementById("summaryLength");
const summaryTone = document.getElementById("summaryTone");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");
const settingsMessage = document.getElementById("settingsMessage");

const groqApiKeyInput = document.getElementById("groqApiKeyInput");
const toggleGroqVisibilityBtn = document.getElementById(
  "toggleGroqVisibilityBtn",
);

// Toggle settings panel
settingsToggle.addEventListener("click", () => {
  const isExpanded = settingsToggle.getAttribute("aria-expanded") === "true";

  if (isExpanded) {
    // Close panel
    settingsToggle.setAttribute("aria-expanded", "false");
    settingsPanel.classList.add("hidden");
  } else {
    // Open panel
    settingsToggle.setAttribute("aria-expanded", "true");
    settingsPanel.classList.remove("hidden");
  }
});

// Toggle API key visibility
toggleVisibilityBtn.addEventListener("click", () => {
  const type = apiKeyInput.type === "password" ? "text" : "password";
  apiKeyInput.type = type;
  toggleVisibilityBtn.textContent = type === "password" ? "👁️" : "🙈";
});

toggleGroqVisibilityBtn.addEventListener("click", () => {
  const type = groqApiKeyInput.type === "password" ? "text" : "password";
  groqApiKeyInput.type = type;
  toggleGroqVisibilityBtn.textContent = type === "password" ? "👁️" : "🙈";
});

// Load saved settings
async function loadSettings() {
  var result = await chrome.storage.local.get([
    "api_key",
    "groq_api_key",
    "user_settings",
  ]);

  if (result.api_key) {
    apiKeyInput.value = result.api_key;
  }

  if (result.groq_api_key) {
    groqApiKeyInput.value = result.groq_api_key;
  }

  if (result.user_settings) {
    summaryLength.value = result.user_settings.summaryLength || "standard";
    summaryTone.value = result.user_settings.tone || "concise";
  }
}

// Save settings
saveSettingsBtn.addEventListener("click", async () => {
  var apiKey = apiKeyInput.value.trim();
  var groqKey = groqApiKeyInput.value.trim();

  if (!apiKey && !groqKey) {
    showSettingsMessage(
      "Please enter at least one API key (Gemini or Groq)",
      "error",
    );
    return;
  }

  try {
    await chrome.storage.local.set({
      api_key: apiKey,
      groq_api_key: groqKey,
      user_settings: {
        summaryLength: summaryLength.value,
        tone: summaryTone.value,
      },
    });
    showSettingsMessage("Settings saved successfully!", "success");
  } catch (error) {
    showSettingsMessage("Failed to save settings", "error");
  }
});

// Clear cache
clearCacheBtn.addEventListener("click", async () => {
  try {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      api_key: apiKeyInput.value.trim(),
      groq_api_key: groqApiKeyInput.value.trim(),
      user_settings: {
        summaryLength: summaryLength.value,
        tone: summaryTone.value,
      },
    });
    showSettingsMessage("Cache cleared successfully!", "success");
  } catch (error) {
    showSettingsMessage("Failed to clear cache", "error");
  }
});

function showSettingsMessage(text, type) {
  settingsMessage.textContent = text;
  settingsMessage.className = `settings-message ${type}`;
  settingsMessage.classList.remove("hidden");

  setTimeout(() => {
    settingsMessage.classList.add("hidden");
  }, 3000);
}

// Load settings on popup open
loadSettings();

// Run when popup loads
displayPageTitle();

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

// Run when popup loads
displayPageTitle();

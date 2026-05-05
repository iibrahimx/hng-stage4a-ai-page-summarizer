// This file is deployed to Vercel as a serverless function
// It holds the Groq API key securely as an environment variable

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { content, settings } = req.body;

    if (!content) {
      return res.status(400).json({ error: "No content provided" });
    }

    const prompt = buildPrompt(content, settings || {});

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a professional content summarizer. Always respond with clean HTML. Never include markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res
        .status(500)
        .json({ error: errorData.error?.message || "API error" });
    }

    const data = await response.json();
    return res.status(200).json({ summary: data.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function buildPrompt(content, settings) {
  const lengthGuide = {
    brief: "exactly 3 bullet points",
    standard: "exactly 5 bullet points",
    detailed: "exactly 8 bullet points",
  };

  const toneGuide = {
    concise: "Be direct and to the point. Use short, clear sentences.",
    detailed: "Include key details and supporting context in each point.",
    simple:
      "Use simple, easy-to-understand language suitable for a general audience.",
  };

  const summaryLength = settings.summaryLength || "standard";
  const tone = settings.tone || "concise";

  return (
    "You are a professional content summarizer. Your task is to summarize the following webpage content.\n\n" +
    'CONTENT TO SUMMARIZE:\n"""\n' +
    content.substring(0, 6000) +
    '\n"""\n\n' +
    "IMPORTANT INSTRUCTIONS - FOLLOW THESE EXACTLY:\n\n" +
    '1. First, create a "Key Insights" section with 2-3 important takeaways from the content.\n' +
    '2. Then, create a "Summary" section with ' +
    lengthGuide[summaryLength] +
    ".\n" +
    "3. " +
    toneGuide[tone] +
    "\n" +
    "4. Each bullet point must be a complete, meaningful sentence.\n" +
    "5. You MUST include BOTH sections: Key Insights AND Summary.\n\n" +
    "FORMAT YOUR ENTIRE RESPONSE EXACTLY LIKE THIS:\n" +
    "<h3>Key Insights</h3>\n<ul>\n  <li>First key insight here</li>\n  <li>Second key insight here</li>\n</ul>\n" +
    "<h3>Summary</h3>\n<ul>\n  <li>Summary point 1</li>\n  <li>Summary point 2</li>\n</ul>\n\n" +
    "RULES:\n- Do NOT include any text before the first <h3> tag.\n- Do NOT wrap your response in markdown code blocks."
  );
}

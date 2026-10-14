
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST method required"
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({
      success: false,
      error: "DEEPSEEK_API_KEY is missing in Vercel settings."
    });
  }

  const body = req.body || {};
  const prompt =
    typeof body.prompt === "string" ? body.prompt.trim() : "";
  const currentHtml =
    typeof body.currentHtml === "string" ? body.currentHtml : "";

  if (!prompt || prompt.length > 5000) {
    return res.status(400).json({
      success: false,
      error: "Enter a valid prompt (maximum 5000 characters)."
    });
  }

  if (currentHtml.length > 100000) {
    return res.status(400).json({
      success: false,
      error: "Current HTML is too large to edit."
    });
  }

  const hasCurrent = currentHtml.trim().length > 0;

  const systemMessage = hasCurrent
    ? "You are NexaBuild AI, editing an existing website. Apply only the user's requested changes. Preserve unrelated sections, styling, and functionality. Return the complete updated HTML document, with embedded CSS and JavaScript. Do not use Markdown fences or explanations.\n\nCURRENT WEBSITE HTML:\n" +
      currentHtml
    : "You are NexaBuild AI, a professional website generator. Return one complete HTML document with embedded CSS and JavaScript. Start with <!DOCTYPE html>. Do not use Markdown fences or explanations.";

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [
            {
              role: "system",
              content: systemMessage
            },
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false,
          max_tokens: 8000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter API error:", response.status, data);

      const messages = {
        401: "API key is invalid or unauthorized.",
        402: "Check account balance or billing.",
        403: "API access denied.",
        429: "Rate limit reached. Try again later."
      };

      return res.status(response.status).json({
        success: false,
        error:
          messages[response.status] ||
          data.error?.message ||
          "Generation failed."
      });
    }

    let html = data.choices?.[0]?.message?.content?.trim();

    if (!html) {
      return res.status(502).json({
        success: false,
        error: "AI returned an empty response."
      });
    }

    html = html
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const start = html.search(/<!doctype html|<html[\s>]/i);

    if (start === -1) {
      return res.status(502).json({
        success: false,
        error: "AI did not return a complete HTML document."
      });
    }

    html = html.slice(start);

    return res.status(200).json({
      success: true,
      html
    });
  } catch (error) {
    console.error("Generation error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Server error while generating the website."
    });
  }
};

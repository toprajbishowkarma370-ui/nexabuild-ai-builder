module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST method required."
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: "Missing DEEPSEEK_API_KEY in Vercel settings."
    });
  }

  const prompt =
    typeof req.body?.prompt === "string"
      ? req.body.prompt.trim()
      : "";

  if (!prompt || prompt.length > 5000) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid website description."
    });
  }

  try {
    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
        model: "deepseek/deepseek-r1:free"
            
          messages: [
            {
              role: "system",
              content: "Generate a complete HTML website with embedded CSS and JavaScript. Return only HTML, without Markdown fences."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false,
          max_tokens: 4000
        })
      }
    );

    if (!response.ok) {
      console.error("DeepSeek HTTP status:", response.status);

      const messages = {
        401: "API key authentication failed. Check your key.",
        402: "DeepSeek account billing or balance issue.",
        403: "DeepSeek API access denied.",
        429: "Too many requests. Try again later."
      };

      return res.status(502).json({
        success: false,
        error: messages[response.status] ||
          "DeepSeek API request failed. Check Vercel logs."
      });
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content?.trim();

    if (!html) {
      return res.status(502).json({
        success: false,
        error: "AI returned an empty response."
      });
    }

    html = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (!/<html[\s>]/i.test(html) &&
        !/<!doctype html/i.test(html)) {
      return res.status(502).json({
        success: false,
        error: "AI did not return complete HTML. Try again."
      });
    }

    return res.status(200).json({
      success: true,
      html
    });

  } catch (error) {
    console.error("Generation error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Server error. Please try again."
    });
  }
}

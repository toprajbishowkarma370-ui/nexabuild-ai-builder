
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST method required" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({
      error: "DEEPSEEK_API_KEY is missing in Vercel settings."
    });
  }

  const prompt =
    typeof req.body?.prompt === "string"
      ? req.body.prompt.trim()
      : "";

  if (!prompt || prompt.length > 5000) {
    return res.status(400).json({
      error: "Enter a valid prompt (maximum 5000 characters)."
    });
  }

  try {
    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-flash",
          messages: [
            {
              role: "system",
              content:
                "You are NexaBuild AI, a professional website generator. Return one complete HTML document with embedded CSS and JavaScript. Start with <!DOCTYPE html>. Do not use Markdown fences or explanations."
            },
            { role: "user", content: prompt }
          ],
          thinking: { type: "disabled" },
          stream: false,
          max_tokens: 8000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("DeepSeek API error:", response.status, data);

      const messages = {
        401: "DeepSeek API key is invalid or unauthorized.",
        402: "Check DeepSeek account balance or billing.",
        403: "DeepSeek API access denied.",
        429: "Rate limit reached. Try again later."
      };

      return res.status(response.status).json({
        error: messages[response.status] ||
          data.error?.message ||
          "DeepSeek generation failed."
      });
    }

    let html = data.choices?.[0]?.message?.content?.trim();

    if (!html) {
      return res.status(502).json({
        error: "DeepSeek returned an empty response."
      });
    }

    html = html
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const start = html.search(/<!doctype html|<html[\s>]/i);

    if (start === -1) {
      return res.status(502).json({
        error: "AI did not return a complete HTML document."
      });
    }

    html = html.slice(start);

    data.choices[0].message.content = html;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Generation error:", error.message);

    return res.status(500).json({
      error: "Server error while generating the website."
    });
  }
};

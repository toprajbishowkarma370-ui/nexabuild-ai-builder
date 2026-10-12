export default async function handler(req, res) {
res.setHeader("Cache-Control", "no-store");

if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).json({
success: false,
error: "Use POST for website generation."
});
}

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
return res.status(503).json({
success: false,
error: "DEEPSEEK_API_KEY is missing in Vercel."
});
}

const prompt =
typeof req.body?.prompt === "string"
? req.body.prompt.trim()
: "";

if (!prompt || prompt.length > 5000) {
return res.status(400).json({
success: false,
error: "Enter a prompt between 1 and 5000 characters."
});
}

try {
const response = await fetch(
"https://api.deepseek.com/chat/completions",
{
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer ${apiKey}"
},
body: JSON.stringify({
model: "deepseek-chat",
messages: [
{
role: "system",
content: "Create a complete, self-contained HTML website based on the user's request. Include CSS and JavaScript inside the HTML. Return only HTML, without Markdown fences."
},
{
role: "user",
content: prompt
}
],
temperature: 0.7,
max_tokens: 4000
})
}
);

if (!response.ok) {
  console.error("DeepSeek API status:", response.status);
  return res.status(502).json({
    success: false,
    error: "DeepSeek request failed. Check API key and account balance."
  });
}

const data = await response.json();
let html = data.choices?.[0]?.message?.content?.trim();

if (!html) {
  return res.status(502).json({
    success: false,
    error: "DeepSeek returned an empty response."
  });
}

html = html
  .replace(/^```html\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/\s*```$/, "")
  .trim();

if (!/<html[\s>]/i.test(html) && !/<!doctype html/i.test(html)) {
  return res.status(502).json({
    success: false,
    error: "AI did not return a complete HTML document."
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
error: "Server error while generating the website."
});
}
}

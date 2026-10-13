module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key is missing in server configuration' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexabuild-ai-builder-f55j.vercel.app',
        'X-Title': 'NexaBuild AI Builder'
      },
      body: JSON.stringify({
        model: "openrouter/auto:free",
        messages: [
          {
            role: 'system',
            content: 'You are a web generator. Output strictly raw HTML/CSS code inside a valid single HTML file. Start directly with <!DOCTYPE html> or <html>. Do not use markdown backticks, explanations, or quotes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Failed to fetch from OpenRouter'
      });
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      let rawContent = data.choices[0].message.content || '';
      rawContent = rawContent.replace(/```html?/gi, '').replace(/```/g, '').trim();
      const htmlStartMatch = rawContent.match(/<!DOCTYPE html|<html/i);
      if (htmlStartMatch) {
        rawContent = rawContent.substring(htmlStartMatch.index);
      }
      data.choices[0].message.content = rawContent;
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

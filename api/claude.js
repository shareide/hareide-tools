export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await req.text();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: body
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

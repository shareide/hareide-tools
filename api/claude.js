const https = require(‘https’);

module.exports = async function handler(req, res) {
if (req.method !== ‘POST’) {
return res.status(405).json({ error: ‘Method not allowed’ });
}

const apiKey = req.headers[‘x-api-key’];
if (!apiKey || !apiKey.startsWith(‘sk-ant-’)) {
return res.status(401).json({ error: ‘Missing or invalid API key’ });
}

const body = JSON.stringify(req.body);

return new Promise((resolve) => {
const options = {
hostname: ‘api.anthropic.com’,
path: ‘/v1/messages’,
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Content-Length’: Buffer.byteLength(body),
‘x-api-key’: apiKey,
‘anthropic-version’: ‘2023-06-01’
}
};

```
const request = https.request(options, (response) => {
  let data = '';
  response.on('data', chunk => { data += chunk; });
  response.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      res.status(response.statusCode).json(parsed);
    } catch(e) {
      res.status(500).json({ error: 'Parse error: ' + e.message, raw: data.substring(0, 200) });
    }
    resolve();
  });
});

request.on('error', (err) => {
  res.status(500).json({ error: err.message });
  resolve();
});

request.write(body);
request.end();
```

});
};

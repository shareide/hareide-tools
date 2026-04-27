export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method not allowed' });

  }

  try {

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {

      return res.status(200).json({ error: 'Missing API key' });

    }

    const { product } = req.body || {};

    if (!product) {

      return res.status(200).json({ error: 'Missing product' });

    }

    const title = product.title || 'Uten tittel';

    const body = String(product.body_html || '')

      .replace(/<[^>]+>/g, ' ')

      .replace(/\s+/g, ' ')

      .trim();

    const prompt = `

Skriv en kort, naturlig norsk produktbeskrivelse for et kunstprint.

Original tittel:

${title}

Eksisterende tekst:

${body.slice(0, 500)}

Regler:

- Skriv flytende norsk bokmål

- Ikke bruk "fra jeg", "fra meg viser", "bildet viser" eller lignende

- Ikke bruk navnet Svein Hareide

- Skriv naturlig og enkelt

- 80–120 ord

Svar kun med JSON:

{

  "no_body_html": "<p>tekst</p>"

}

`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'x-api-key': apiKey,

        'anthropic-version': '2023-06-01'

      },

      body: JSON.stringify({

        model: 'claude-sonnet-4-6',

        max_tokens: 800,

        temperature: 0,

        messages: [{ role: 'user', content: prompt }]

      })

    });

    const textData = await response.text();

    const match = textData.match(/\{[\s\S]*\}/);

    if (!match) {

      return res.status(200).json({

        error: 'No JSON',

        raw: textData

      });

    }

    let parsed;

    try {

      parsed = JSON.parse(match[0]);

    } catch (e) {

      return res.status(200).json({

        error: 'Parse error',

        raw: textData

      });

    }

    return res.status(200).json(parsed);

  } catch (err) {

    return res.status(200).json({ error: err.message });

  }

}

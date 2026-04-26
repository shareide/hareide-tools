export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method not allowed' });

  }

  try {

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {

      return res.status(500).json({

        error: 'Missing ANTHROPIC_API_KEY in Vercel Environment Variables'

      });

    }

 const {

  product,

  mode = 'no',

  fixMetaTitle = true,

  fixMetaDesc = true,

  fixBody = true,

  fixAlt = true,

  fixTags = true,

  fixVendor = true

} = req.body || {};

    if (!product) {

      return res.status(400).json({ error: 'Missing product data' });

    }

    const title = product.title || 'Uten tittel';

    const bodyRaw = product.body_html || product.body || product['body_html'] || '';

    const existingBody = String(bodyRaw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const existingTags = product.tags || '';

    const fieldsNeeded = [];

   if (fixMetaTitle) {

  fieldsNeeded.push('"no_seo_title"');

}

    if (fixMetaDesc) {

      fieldsNeeded.push('"no_seo_description"');

    }

    if (fixBody) {

      fieldsNeeded.push('"no_body_html"');

      fieldsNeeded.push('"en_body_html"');

    }

    if (fixAlt) {

      fieldsNeeded.push('"no_alt_text"');

      fieldsNeeded.push('"en_alt_text"');

    }

    if (fixTags) {

      fieldsNeeded.push('"no_tags"');

      fieldsNeeded.push('"en_tags"');

    }

const isEN = mode === 'en';

const prompt = isEN ? `

You are an expert SEO copywriter for art prints.

Artist: HareideART (Svein Hareide)

Write ONLY in English.

Product: ${title}

Existing text:

${existingBody.slice(0, 800)}

Return ONLY valid JSON with these fields:

${fieldsNeeded.join(', ')}

Rules:

- All fields must be in English

- seo_title: max 65 chars

- seo_description: 130–155 chars

- body_html: 120–180 words, only <p> tags

- alt_text: 10–18 words

- tags: comma-separated

- No explanations

- No markdown

` : `

Du er en profesjonell SEO-tekstforfatter for kunst.

Produkt:

${title}

Eksisterende tekst:

${existingBody.slice(0, 800)}

Returner KUN gyldig JSON med disse feltene:

${fieldsNeeded.join(', ')}

Krav:

- Alle felter på norsk

- no_seo_title: maks 65 tegn

- no_seo_description: 130–155 tegn

- no_body_html: 120–180 ord

- no_alt_text: 10–18 ord

- no_tags: kommaseparert

- Kun JSON

`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'x-api-key': apiKey,

        'anthropic-version': '2023-06-01'

      },

      body: JSON.stringify({

        model: 'claude-sonnet-4-20250514',

        max_tokens: 2500,

        messages: [

          {

            role: 'user',

            content: prompt

          }

        ]

      })

    });

    if (!claudeRes.ok) {

      const errorText = await claudeRes.text();

      return res.status(claudeRes.status).json({

        error: errorText

      });

    }

    const data = await claudeRes.json();

    const text = data.content?.map(part => part.text || '').join('').trim() || '';

    const jsonStart = text.indexOf('{');

    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {

      return res.status(500).json({

        error: 'Claude returned no JSON',

        raw: text

      });

    }

    const jsonText = text.slice(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonText);

    if (fixVendor) {

      parsed.vendor = 'HareideART';

    }

    return res.status(200).json(parsed);

  } catch (err) {

    return res.status(500).json({

      error: err.message

    });

  }

}


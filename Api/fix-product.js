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

      fieldsNeeded.push('"en_seo_title"');

    }

    if (fixMetaDesc) {

      fieldsNeeded.push('"no_seo_description"');

      fieldsNeeded.push('"en_seo_description"');

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

    const prompt = `

Du er en profesjonell SEO-tekstforfatter for kunst, kunstprint, giclée print og nettgalleri.

Kunstner: Svein Hareide / HareideART.

Tone: varm, konkret, levende, kort og informativ.

Unngå tomme reklamefraser.

Beskriv stemning, farger, uttrykk, teknikk og mulig bruk i hjemmet.

Produkt:

${title}

Eksisterende tekst:

${existingBody.slice(0, 800)}

Eksisterende tags:

${existingTags}

Returner KUN gyldig JSON med disse feltene:

${fieldsNeeded.join(', ')}

Krav:

- no_seo_title: norsk, maks 65 tegn.

- en_seo_title: engelsk, maks 65 tegn.

- no_seo_description: norsk, 130–155 tegn.

- en_seo_description: engelsk, 130–155 tegn.

- no_body_html: norsk, 120–180 ord, kun <p>-tagger.

- en_body_html: engelsk, 120–180 ord, kun <p>-tagger.

- no_alt_text: norsk, 10–18 ord.

- en_alt_text: engelsk, 10–18 words.

- no_tags: norske tags, kommaseparert.

- en_tags: English tags, comma-separated.

- Ikke inkluder forklaring.

- Ikke bruk markdown.

- Ikke bland norsk og engelsk i samme felt.

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

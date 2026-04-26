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

   const isEN = mode === 'en';

const fieldsNeeded = [];

if (fixMetaTitle) {

  fieldsNeeded.push(isEN ? '"seo_title"' : '"no_seo_title"');

}

if (fixMetaDesc) {

  fieldsNeeded.push(isEN ? '"seo_description"' : '"no_seo_description"');

}

if (fixBody) {

  fieldsNeeded.push(isEN ? '"body_html"' : '"no_body_html"');

}

if (fixAlt) {

  fieldsNeeded.push(isEN ? '"alt_text"' : '"no_alt_text"');

}

if (fixTags) {

  fieldsNeeded.push(isEN ? '"tags"' : '"no_tags"');

}

const prompt = isEN ? `

You are an expert SEO copywriter for art prints.
Write in a personal tone, as if the artist is speaking directly.

Use "I", "my", and "me" naturally.

Avoid third-person references like "Svein Hareide".

The tone should feel warm, authentic and human – not generic or overly commercial.

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

Du er en profesjonell SEO-tekstforfatter for kunst og nettbutikker.
Skriv i en personlig stil, som om kunstneren selv skriver.

Bruk "jeg", "min" og "mitt" naturlig i teksten.

Bruk gjerne "HareideART" som avsender, men unngå tredjeperson som "Svein Hareide".

Teksten skal føles ekte, varm og personlig – ikke som en generisk butikktekst.

Oppgave:

Forbedre eksisterende produktbeskrivelse – ikke skriv helt ny.

Produkt:

${title}

Eksisterende tekst:

${existingBody.slice(0, 800)}

Instruksjoner:

- Behold struktur og mening der det er mulig

- Forbedre språk, flyt og lesbarhet

- Legg til stemning, farger og bruksområde (stue, gang, soverom)

- Gjør teksten mer levende og trygg

- Unngå gjentakelser

- Ikke bruk overdrevet salgsspråk

- Ikke gjør teksten mye lengre enn originalen
Hvis teksten er god → behold 80%

Hvis dårlig → skriv mer nytt

Returner:

- no_body_html (kun <p>-tagger)

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
let data;

let lastError = null;

for (let attempt = 1; attempt <= 2; attempt++) {

  try {

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

      lastError = `Claude API error ${claudeRes.status}: ${errorText}`;

      if (attempt === 2) {

        return res.status(200).json({

          error: lastError

        });

      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      continue;

    }

    data = await claudeRes.json();

    break;

  } catch (err) {

    lastError = err.message;

    if (attempt === 2) {

      return res.status(200).json({

        error: lastError

      });

    }

    await new Promise(resolve => setTimeout(resolve, 1500));

  }

}

if (!data) {

  return res.status(200).json({

    error: lastError || 'Unknown Claude error'

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


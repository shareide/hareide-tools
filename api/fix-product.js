export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method not allowed' });

  }

  try {

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {

      return res.status(200).json({ error: 'Missing ANTHROPIC_API_KEY' });

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

      return res.status(200).json({ error: 'Missing product data' });

    }

    const isEN = mode === 'en';

    const title = product.title || 'Uten tittel';

    const existingBody = String(product.body_html || product.body || '')

      .replace(/<[^>]+>/g, ' ')

      .replace(/\s+/g, ' ')

      .trim();

    const existingTags = product.tags || '';

    const fieldsNeeded = [];

    if (fixMetaTitle) fieldsNeeded.push(isEN ? '"seo_title"' : '"no_seo_title"');

    if (fixMetaDesc) fieldsNeeded.push(isEN ? '"seo_description"' : '"no_seo_description"');

    if (fixBody) fieldsNeeded.push(isEN ? '"body_html"' : '"no_body_html"');

    if (fixAlt) fieldsNeeded.push(isEN ? '"alt_text"' : '"no_alt_text"');

    if (fixTags) fieldsNeeded.push(isEN ? '"tags"' : '"no_tags"');

    const prompt = isEN ? `

Write ONLY English JSON.

Original title: ${title}

Existing text: ${existingBody.slice(0, 800)}

Existing tags: ${existingTags}

Return ONLY valid JSON with these fields:

${fieldsNeeded.join(', ')}

Rules:

- seo_title max 65 chars

- seo_description 130-155 chars

- body_html 120-180 words, only <p> tags

- alt_text 10-18 words

- tags comma-separated

- No markdown

- No explanation

` : `

Skriv KUN norsk bokmål.

Original tittel:

${title}

Eksisterende tekst:

${existingBody.slice(0, 800)}

Eksisterende tags:

${existingTags}

Oppgave:

Skriv en forbedret produkttekst i varm, personlig og naturlig stil inspirert av Fanny Blake.

Regler:

- Skriv som om jeg selv skriver som kunstner.

- Bruk "jeg", "min" og "mitt" naturlig der det passer.

- Ikke bruk navnet "Svein Hareide".

- Ikke bruk "kunstneren", "han" eller "Hareide".

- Ikke skriv "fra meg viser", "mitt motiv viser" eller "bildet viser".

- Bruk heller formuleringer som "Jeg har malt...", "Her har jeg arbeidet med..." eller "I dette motivet har jeg ønsket å...".

- Behold hovedideen fra eksisterende tekst.

- Beskriv farger, stemning, motiv og hvor bildet kan passe.

- Ikke aggressivt salgsspråk.

Tittel:

- Behold originaltittelen først.

- Utvid naturlig med søkeord som kunstprint, veggkunst, moderne kunst, abstrakt kunst eller figurativ kunst når det passer.

Returner KUN gyldig JSON med disse feltene:

${fieldsNeeded.join(', ')}

Krav:

- no_seo_title maks 65 tegn

- no_seo_description 130-155 tegn

- no_body_html 120-180 ord, kun <p>-tagger

- no_alt_text 10-18 ord

- no_tags kommaseparert

- Ingen markdown

- Ingen forklaring

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

        messages: [{ role: 'user', content: prompt }]

      })

    });

    if (!claudeRes.ok) {

      const errText = await claudeRes.text();

      return res.status(200).json({ error: errText });

    }

    const data = await claudeRes.json();

    const text = data.content?.map(p => p.text || '').join('').trim() || '';

    const start = text.indexOf('{');

    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {

      return res.status(200).json({ error: 'Claude returned no JSON', raw: text });

    }

    let parsed;

    try {

      parsed = JSON.parse(text.slice(start, end + 1));

    } catch (e) {

      return res.status(200).json({ error: 'JSON parse error', raw: text });

    }

    if (!isEN && fixVendor) {

      parsed.vendor = 'HareideART';

    }

    return res.status(200).json(parsed);

  } catch (err) {

    return res.status(200).json({ error: err.message });

  }

}

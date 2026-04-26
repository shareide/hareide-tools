export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method not allowed' });

  }

  try {

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {

      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY on server' });

    }

    const {

      product,

      fixMetaTitle,

      fixMetaDesc,

      fixBody,

      fixAlt,

      fixTags,

      fixVendor

    } = req.body || {};

    const title = product?.title || 'Untitled artwork';

    const existingBody = (product?.body_html || product?.body || '')

      .replace(/<[^>]+>/g, ' ')

      .trim();

    const existingTags = product?.tags || '';

    const fieldsNeeded = [];

    if (fixMetaTitle) {

      fieldsNeeded.push('no_seo_title: SEO-tittel på NORSK, 50-65 tegn, inkluder "HareideART" og relevante kunstord');

      fieldsNeeded.push('en_seo_title: SEO title in ENGLISH, 50-65 chars, include "HareideART" and key art terms');

    }

    if (fixMetaDesc) {

      fieldsNeeded.push('no_seo_description: Meta-beskrivelse på NORSK, 130-155 tegn, varm og levende tone');

      fieldsNeeded.push('en_seo_description: Meta description in ENGLISH, 130-155 chars, warm and atmospheric');

    }

    if (fixBody) {

      fieldsNeeded.push('no_body_html: Produktbeskrivelse på NORSK, 150-200 ord. Kort, levende, informativ. Bruk kun <p>-tagger.');

      fieldsNeeded.push('en_body_html: Product description in ENGLISH, 150-200 words. Warm, clear, atmospheric. Use only <p> tags.');

    }

    if (fixAlt) {

      fieldsNeeded.push('no_alt_text: Alt-tekst på NORSK, 10-15 ord, beskrivende og konkret');

      fieldsNeeded.push('en_alt_text: Alt text in ENGLISH, 10-15 words, descriptive and concrete');

    }

    if (fixTags) {

      fieldsNeeded.push('no_tags: Kommaseparerte norske tags, 5-6 stk');

      fieldsNeeded.push('en_tags: Comma-separated English tags, 5-6 items');

    }

    const prompt = `

Du er en ekspert på SEO-tekster for kunst, kunstprint og nettgalleri.

Kunstner: Svein Hareide / HareideART.

Tone: varm, litterær, kort, informativ og levende. Ikke bruk tomme reklamefraser.

Produktittel:

"${title}"

Eksisterende beskrivelse:

"${existingBody.substring(0, 500)}"

Eksisterende tags:

"${existingTags}"

Lag KUN gyldig JSON med disse feltene:

${fieldsNeeded.join('\n')}

Regler:

- Alle no_-felt skal være norsk bokmål.

- Alle en_-felt skal være engelsk.

- Ikke bland språk.

- Body HTML skal kun bruke <p>-tagger.

- Ikke inkluder produktkategori, product_type eller Google-kategori.

- Svar kun med JSON. Ingen forklaring.

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

        max_tokens: 2000,

        messages: [{ role: 'user', content: prompt }]

      })

    });

    if (!claudeRes.ok) {

      const errorText = await claudeRes.text();

      return res.status(claudeRes.status).json({ error: errorText });

    }

    const data = await claudeRes.json();

    const text = data.content?.map(c => c.text || '').join('') || '';

    const clean = text.replace(/```json|```/g, '').trim();

    const parsed = JSON.parse(clean);

    if (fixVendor) {

      parsed.vendor = 'HareideART';

    }

    return res.status(200).json(parsed);

  } catch (err) {

    return res.status(500).json({ error: err.message });

  }

}

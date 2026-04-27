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

Write ONLY valid English JSON.

Original title:

${title}

Existing text:

${existingBody.slice(0, 800)}

Existing tags:

${existingTags}

Return ONLY these JSON fields:

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

Skriv KUN gyldig JSON på norsk bokmål.

Original tittel:

${title}

Eksisterende tekst:

${existingBody.slice(0, 800)}

Eksisterende tags:

${existingTags}

Oppgave:

Skriv en ny og forbedret produkttekst basert på eksisterende tekst.

Teksten skal være varm, personlig, naturlig og inspirert av Fanny Blake.

Viktige regler:

- Skriv som om jeg selv skriver som kunstner.

- Bruk "jeg", "min" og "mitt" naturlig der det passer.

- Ikke bruk navnet "Svein Hareide".

- Ikke bruk "kunstneren", "han" eller "Hareide".

- Ikke skriv "fra jeg viser", "fra meg viser", "bildet viser" eller "mitt motiv viser".

- Ikke start med "Dette motivet viser" eller "Dette bildet viser".

- Skriv nye, naturlige norske setninger fra bunnen.

- Bruk heller formuleringer som "Jeg har malt...", "Her har jeg arbeidet med..." eller "I dette motivet har jeg ønsket å...".

- Beskriv konkrete farger, former, stemning og hvor bildet passer.

- Ikke bruk aggressivt salgsspråk.

Tittel:

- Behold originaltittelen først.

- Utvid naturlig med søkeord som kunstprint, veggkunst, moderne kunst, abstrakt kunst eller figurativ kunst når det passer.

Returner KUN disse JSON-feltene:

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

  model: 'claude-sonnet-4-6',

  max_tokens: 2500,

  system: isEN

    ? 'You are a professional English copywriter. Return only valid JSON.'

    : 'Du er en profesjonell norsk tekstforfatter. Skriv naturlig bokmål i varm, personlig stil, men ikke press inn jeg-form i alle setninger. Bruk jeg/min/mitt bare der det gir god norsk. Ikke bruk navnet Svein Hareide. Skriv aldri formuleringer som "fra jeg viser", "fra meg viser", "bildet viser" eller "motivet viser". Returner kun gyldig JSON.'

  messages: [{ role: 'user', content: prompt }]

})

    });

    if (!claudeRes.ok) {

      const errText = await claudeRes.text();

      return res.status(200).json({ error: errText });

    }

    const data = await claudeRes.json();

    const text = data.content?.map(part => part.text || '').join('').trim() || '';

    const start = text.indexOf('{');

    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {

      return res.status(200).json({

        error: 'Claude returned no JSON',

        raw: text

      });

    }

    let parsed;

    try {

      parsed = JSON.parse(text.slice(start, end + 1));

    } catch (e) {

      return res.status(200).json({

        error: 'JSON parse error',

        raw: text

      });

    }

    function cleanNorwegian(value) {

      return String(value || '')

        .replace(/Dette ([^.]+?) fra jeg viser/gi, 'Jeg har malt $1 som viser')

        .replace(/Dette ([^.]+?) fra meg viser/gi, 'Jeg har malt $1 som viser')

        .replace(/fra jeg viser/gi, 'har jeg ønsket å vise')

        .replace(/fra meg viser/gi, 'har jeg ønsket å vise')

        .replace(/mitt motiv viser/gi, 'i motivet arbeider jeg med')

        .replace(/bildet viser/gi, 'her har jeg arbeidet med')

        .replace(/Svein Hareides/gi, 'min')

        .replace(/Svein Hareide/gi, 'meg')

        .replace(/Hareides/gi, 'min')

        .replace(/av jeg/gi, 'av meg')

        .replace(/fra jeg/gi, 'fra meg')

        .replace(/<p>\s*([a-zæøå])/g, (m, c) => '<p>' + c.toUpperCase())

        .replace(/\s+/g, ' ')

        .trim();

    }

    if (!isEN) {

      if (typeof parsed.no_body_html === 'string') {

        parsed.no_body_html = cleanNorwegian(parsed.no_body_html);

      }

      if (typeof parsed.no_seo_description === 'string') {

        parsed.no_seo_description = cleanNorwegian(parsed.no_seo_description);

      }

      if (typeof parsed.no_alt_text === 'string') {

        parsed.no_alt_text = cleanNorwegian(parsed.no_alt_text);

      }

      if (typeof parsed.no_seo_title === 'string') {

        parsed.no_seo_title = cleanNorwegian(parsed.no_seo_title);

      }

      if (typeof parsed.no_tags === 'string') {

        parsed.no_tags = cleanNorwegian(parsed.no_tags);

      }

    }

    if (!isEN && fixVendor) {

      parsed.vendor = 'HareideART';

    }

    return res.status(200).json(parsed);

  } catch (err) {

    return res.status(200).json({ error: err.message });

  }

}

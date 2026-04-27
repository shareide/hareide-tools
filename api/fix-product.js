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

    const isEN = mode === 'en';

    const title = product.title || 'Uten tittel';

    const bodyRaw = product.body_html || product.body || '';

    const existingBody = String(bodyRaw)

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

Write ONLY in English. Use a personal first-person artist voice.

Product: ${title}

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

- No markdown, no explanation

` : `

Skriv KUN på norsk bokmål. Teksten skal alltid skrives i førsteperson, som om jeg som kunstner skriver direkte. Bruk "jeg", "meg", "min" og "mitt" naturlig. Ikke bruk navnet "Svein Hareide". Ikke bruk tredjeperson som "kunstneren", "han" eller "Hareide". Hvis originalteksten inneholder "Svein Hareide", skal navnet fjernes og teksten skrives personlig i stedet.

Original tittel: ${title}

Eksisterende tekst: ${existingBody.slice(0, 800)}

Eksisterende tags: ${existingTags}
Instruksjoner:

- Skriv som om jeg som kunstner snakker direkte til kunden

- Beskriv motivet visuelt (farger, stemning, uttrykk)

- Nevn hvor bildet passer (stue, gang, soverom)

- Skap en rolig, trygg følelse – ikke aggressivt salg

- Unngå generiske formuleringer

- Unngå gjentakelser
Skriv teksten på nytt basert på innholdet under, men behold hovedideen.

Ikke gjør direkte omskriving ord-for-ord. Skriv naturlige, flytende setninger fra starten.

Unngå formuleringer som:

- "fra meg viser"

- "mitt motiv viser"

- "bildet viser"

Bruk i stedet naturlige formuleringer som:

- "Jeg har malt..."

- "Her arbeider jeg med..."

- "I dette motivet utforsker jeg..."

Teksten skal leses som en ekte norsk tekst skrevet av et menneske – ikke som en omskrevet versjon av originalen.

Tittel-regel:

- Behold den kunstneriske originaltittelen først.

- Utvid tittelen med relevante søkeord.

- Tittelen skal være naturlig, ikke spammete.

- Bruk ord som kunstprint, veggkunst, moderne kunst, abstrakt kunst eller figurativ kunst bare når det passer.

- Ikke bruk "Svein Hareide" i tittelen.

- Eksempel:

  "Samtalen" kan bli "Samtalen – figurativt kunstprint med menneskelig nærvær"

  "Gul stol" kan bli "Gul stol – moderne kunstprint i varme toner"

Returner KUN gyldig JSON med disse feltene:

${fieldsNeeded.join(', ')}

Krav:

- no_seo_title maks 65 tegn

- no_seo_description 130-155 tegn

- no_body_html 120-180 ord, kun <p>-tagger
- Teksten må føles personlig og ekte – hvis den virker generisk, skriv den om

- Unngå setninger som kunne passet til hvilket som helst bilde

- Beskriv noe konkret i motivet (farge, form, stemning)

- Avslutt med en rolig setning som gir en følelse av hvor bildet hører hjemme

- no_alt_text 10-18 ord

- no_tags kommaseparert

- Ingen markdown, ingen forklaring

`;

    let data = null;

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

            messages: [{ role: 'user', content: prompt }]

          })

        });

        if (!claudeRes.ok) {

          lastError = await claudeRes.text();

          await new Promise(r => setTimeout(r, 1500));

          continue;

        }

        data = await claudeRes.json();

        break;

      } catch (err) {

        lastError = err.message;

        await new Promise(r => setTimeout(r, 1500));

      }

    }

    if (!data) {

      return res.status(200).json({ error: lastError || 'Claude failed' });

    }

    const text = data.content?.map(p => p.text || '').join('').trim() || '';

    const start = text.indexOf('{');

    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {

      return res.status(200).json({ error: 'Claude returned no JSON', raw: text });

    }

    const parsed = JSON.parse(text.slice(start, end + 1));
// parsed.no_body_html = makePersonal(parsed.no_body_html);

  let v = String(value || '');

  // Riktig setningsstruktur først

  v = v

    .replace(/Dette (.*?) fra Svein Hareide viser/gi, 'I dette $1 har jeg ønsket å vise')

    .replace(/Dette (.*?) av Svein Hareide viser/gi, 'I dette $1 har jeg ønsket å vise')

    .replace(/Motivet fra Svein Hareide viser/gi, 'I dette motivet har jeg ønsket å vise');

  // Generelle tilfeller

  v = v

    .replace(/fra Svein Hareide/gi, 'av meg')

    .replace(/av Svein Hareide/gi, 'av meg')

    .replace(/Svein Hareides/gi, 'min')

    .replace(/Hareides/gi, 'min');

  return v;

}
if (!isEN) {

  if (parsed.no_body_html) parsed.no_body_html = makePersonal(parsed.no_body_html);

  if (parsed.no_seo_description) parsed.no_seo_description = makePersonal(parsed.no_seo_description);

  if (parsed.no_alt_text) parsed.no_alt_text = makePersonal(parsed.no_alt_text);

  if (parsed.no_seo_title) parsed.no_seo_title = makePersonal(parsed.no_seo_title);

  if (parsed.no_tags) parsed.no_tags = makePersonal(parsed.no_tags);

}
    if (!isEN && fixVendor) {

      parsed.vendor = 'HareideART';

    }

    return res.status(200).json(parsed);

  } catch (err) {

    return res.status(200).json({ error: err.message });

  }

}

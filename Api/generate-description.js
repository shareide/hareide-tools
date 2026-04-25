export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({ error: "Only POST allowed" });

  }

  try {

    const { title } = req.body || {};

    if (!title) {

      return res.status(400).json({ error: "Missing product title" });

    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {

      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });

    }

    const prompt = `

Du skriver produktbeskrivelser for HareideART.

Lag en kort, varm og SEO-vennlig produktbeskrivelse på norsk for dette kunstverket:

Tittel:

${title}

Viktige prinsipper:

- Kort, men informativ

- Levende og beskrivende språk

- Passer for nettgalleri / kunst på nett

- Nevn stemning, farger, rom og bruk

- Bruk naturlige søkeord som kunstprint, veggkunst, moderne kunst, giclée print

- Ikke overdriv

- Ikke bruk hard salgstone

- Skriv i en varm, personlig og troverdig tone

Returner KUN HTML med 3–4 korte avsnitt.

`;

    const response = await fetch("https://api.openai.com/v1/responses", {

      method: "POST",

      headers: {

        "Authorization": `Bearer ${apiKey}`,

        "Content-Type": "application/json"

      },

      body: JSON.stringify({

        model: "gpt-5.5-mini",

        input: prompt

      })

    });

    const data = await response.json();

    if (!response.ok) {

      return res.status(response.status).json({

        error: data.error?.message || "OpenAI API error"

      });

    }

    const description =

      data.output_text ||

      data.output?.[0]?.content?.[0]?.text ||

      "";

    return res.status(200).json({

      description

    });

  } catch (error) {

    return res.status(500).json({

      error: error.message || "Server error"

    });

  }

}

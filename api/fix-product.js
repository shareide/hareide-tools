export default async function handler(req, res) {

  return res.status(200).json({

    no_body_html: "<p>TESTTEKST FRA NY API</p>",

    no_seo_title: "TESTTITTEL",

    no_seo_description: "TEST META",

    no_alt_text: "TEST ALT",

    no_tags: "test, kunstprint",

    vendor: "HareideART"

  });

}

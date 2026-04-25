const SOCIAL_MAP = {
  swiggy: [{ platform: "Twitter/X", handle: "@Swiggy" }, { platform: "Instagram", handle: "@swiggyindia" }],
  zomato: [{ platform: "Twitter/X", handle: "@zomato" }, { platform: "Instagram", handle: "@zomato" }],
  spotify: [{ platform: "Twitter/X", handle: "@Spotify" }, { platform: "Instagram", handle: "@spotify" }],
  netflix: [{ platform: "Twitter/X", handle: "@netflix" }, { platform: "Instagram", handle: "@netflix" }],
  youtube: [{ platform: "Twitter/X", handle: "@YouTube" }, { platform: "Instagram", handle: "@youtube" }],
  amazon: [{ platform: "Twitter/X", handle: "@amazon" }, { platform: "Instagram", handle: "@amazon" }],
  flipkart: [{ platform: "Twitter/X", handle: "@Flipkart" }, { platform: "Instagram", handle: "@flipkart" }],
  uber: [{ platform: "Twitter/X", handle: "@Uber" }, { platform: "Instagram", handle: "@uber" }],
  airbnb: [{ platform: "Twitter/X", handle: "@Airbnb" }, { platform: "Instagram", handle: "@airbnb" }],
  slack: [{ platform: "Twitter/X", handle: "@SlackHQ" }],
  nike: [{ platform: "Twitter/X", handle: "@Nike" }, { platform: "Instagram", handle: "@nike" }],
  instagram: [{ platform: "Instagram", handle: "@instagram" }],
  facebook: [{ platform: "Twitter/X", handle: "@Meta" }, { platform: "Instagram", handle: "@facebook" }],
  snapchat: [{ platform: "Twitter/X", handle: "@Snapchat" }, { platform: "Instagram", handle: "@snapchat" }],
  discord: [{ platform: "Twitter/X", handle: "@discord" }],
  telegram: [{ platform: "Twitter/X", handle: "@telegram" }],
  whatsapp: [{ platform: "Twitter/X", handle: "@WhatsApp" }],
  linkedin: [{ platform: "Twitter/X", handle: "@LinkedIn" }, { platform: "Instagram", handle: "@linkedin" }],
  paytm: [{ platform: "Twitter/X", handle: "@Paytm" }, { platform: "Instagram", handle: "@paytm" }],
  phonepe: [{ platform: "Twitter/X", handle: "@PhonePe_" }, { platform: "Instagram", handle: "@phonepe" }],
  blinkit: [{ platform: "Twitter/X", handle: "@letsblinkit" }, { platform: "Instagram", handle: "@letsblinkit" }],
  zepto: [{ platform: "Twitter/X", handle: "@ZeptoNow" }, { platform: "Instagram", handle: "@zeptonow" }],
  meesho: [{ platform: "Twitter/X", handle: "@Meesho_App" }, { platform: "Instagram", handle: "@meeshoapp" }],
  ola: [{ platform: "Twitter/X", handle: "@Olacabs" }, { platform: "Instagram", handle: "@olacabs" }],
  cred: [{ platform: "Twitter/X", handle: "@CRED_club" }, { platform: "Instagram", handle: "@cred_club" }],
  nykaa: [{ platform: "Twitter/X", handle: "@MyNykaa" }, { platform: "Instagram", handle: "@nykaa" }],
  myntra: [{ platform: "Twitter/X", handle: "@myntra" }, { platform: "Instagram", handle: "@myntra" }],
  hotstar: [{ platform: "Twitter/X", handle: "@DisneyPlusHS" }, { platform: "Instagram", handle: "@disneyplushotstar" }],
  jio: [{ platform: "Twitter/X", handle: "@JioCare" }, { platform: "Instagram", handle: "@reliancejio" }],
  rapido: [{ platform: "Twitter/X", handle: "@rapidobikeapp" }, { platform: "Instagram", handle: "@rapidobikeapp" }],
  bigbasket: [{ platform: "Twitter/X", handle: "@bigbasket_com" }, { platform: "Instagram", handle: "@bigbasket_com" }],
  sony: [{ platform: "Twitter/X", handle: "@Sony" }, { platform: "Instagram", handle: "@sony" }],
  samsung: [{ platform: "Twitter/X", handle: "@SamsungMobile" }, { platform: "Instagram", handle: "@samsung" }],
  microsoft: [{ platform: "Twitter/X", handle: "@Microsoft" }, { platform: "Instagram", handle: "@microsoft" }],
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const query = (body.query || body.appName || "").trim();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: "query is required (min 2 chars)" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const key = query.toLowerCase();
    const socialHandles = SOCIAL_MAP[key] || [];
    const androidSearchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`;

    // Fetch from iTunes Search API
    let itunesData = null;
    let iosAppId = null;
    let androidPackage = null;
    let appName = query;
    let developer = null;
    let iconUrl = null;

    try {
      const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=5&country=in`;
      const iTunesRes = await fetch(iTunesUrl);
      if (iTunesRes.ok) {
        const iTunesJson = await iTunesRes.json();
        if (iTunesJson.results && iTunesJson.results.length > 0) {
          const app = iTunesJson.results[0];
          iosAppId = `id${app.trackId}`;
          appName = app.trackName;
          developer = app.artistName;
          iconUrl = app.artworkUrl100;
          itunesData = { trackId: app.trackId, trackName: app.trackName, artistName: app.artistName };
        }
      }
    } catch (_) { /* iTunes failed, continue */ }

    // Fetch Android package from Play Store HTML
    try {
      const playUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`;
      const playRes = await fetch(playUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (playRes.ok) {
        const html = await playRes.text();
        const match = html.match(/store\/apps\/details\?id=([a-zA-Z][a-zA-Z0-9_.]+)/);
        if (match && match[1] && !match[1].startsWith("com.google.android.play")) {
          androidPackage = match[1];
        }
      }
    } catch (_) { /* Play Store failed, continue */ }

    return new Response(
      JSON.stringify({
        appName,
        iosAppId,
        androidPackage,
        developer,
        iconUrl,
        socialHandles,
        androidSearchUrl,
        raw: { itunes: itunesData },
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});

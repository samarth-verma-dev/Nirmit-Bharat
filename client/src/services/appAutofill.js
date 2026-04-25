/**
 * appAutofill.js — Direct browser-side autofill
 *
 * Strategy:
 *  1. Call iTunes Search API directly (CORS-allowed, free, no key)
 *  2. Enrich with android package + socials from KNOWN_PACKAGES map
 *
 * The Supabase Edge Function (app-autofill) is optional and used only
 * for real-time Play Store scraping when deployed.
 */

// In-memory cache — avoids duplicate network calls
const cache = new Map()

// ── Known app data (android package + social handles) ────────────────────────
const KNOWN_PACKAGES = {
  swiggy:    { android: 'in.swiggy.android',                  socials: [{ platform: 'Twitter/X', handle: '@Swiggy' }, { platform: 'Instagram', handle: '@swiggyindia' }] },
  zomato:    { android: 'com.application.zomato',             socials: [{ platform: 'Twitter/X', handle: '@zomato' }, { platform: 'Instagram', handle: '@zomato' }] },
  spotify:   { android: 'com.spotify.music',                  socials: [{ platform: 'Twitter/X', handle: '@Spotify' }, { platform: 'Instagram', handle: '@spotify' }] },
  netflix:   { android: 'com.netflix.mediaclient',            socials: [{ platform: 'Twitter/X', handle: '@netflix' }, { platform: 'Instagram', handle: '@netflix' }] },
  youtube:   { android: 'com.google.android.youtube',         socials: [{ platform: 'Twitter/X', handle: '@YouTube' }, { platform: 'Instagram', handle: '@youtube' }] },
  instagram: { android: 'com.instagram.android',              socials: [{ platform: 'Instagram', handle: '@instagram' }] },
  facebook:  { android: 'com.facebook.katana',                socials: [{ platform: 'Twitter/X', handle: '@Meta' }, { platform: 'Instagram', handle: '@facebook' }] },
  snapchat:  { android: 'com.snapchat.android',               socials: [{ platform: 'Twitter/X', handle: '@Snapchat' }, { platform: 'Instagram', handle: '@snapchat' }] },
  twitter:   { android: 'com.twitter.android',                socials: [{ platform: 'Twitter/X', handle: '@Twitter' }] },
  uber:      { android: 'com.ubercab',                        socials: [{ platform: 'Twitter/X', handle: '@Uber' }, { platform: 'Instagram', handle: '@uber' }] },
  airbnb:    { android: 'com.airbnb.android',                 socials: [{ platform: 'Twitter/X', handle: '@Airbnb' }, { platform: 'Instagram', handle: '@airbnb' }] },
  slack:     { android: 'com.Slack',                          socials: [{ platform: 'Twitter/X', handle: '@SlackHQ' }] },
  nike:      { android: 'com.nike.omega',                     socials: [{ platform: 'Twitter/X', handle: '@Nike' }, { platform: 'Instagram', handle: '@nike' }] },
  amazon:    { android: 'in.amazon.mShop.android.shopping',   socials: [{ platform: 'Twitter/X', handle: '@amazon' }, { platform: 'Instagram', handle: '@amazon' }] },
  flipkart:  { android: 'com.flipkart.android',               socials: [{ platform: 'Twitter/X', handle: '@Flipkart' }, { platform: 'Instagram', handle: '@flipkart' }] },
  paytm:     { android: 'net.one97.paytm',                    socials: [{ platform: 'Twitter/X', handle: '@Paytm' }, { platform: 'Instagram', handle: '@paytm' }] },
  phonepe:   { android: 'com.phonepe.app',                    socials: [{ platform: 'Twitter/X', handle: '@PhonePe_' }, { platform: 'Instagram', handle: '@phonepe' }] },
  blinkit:   { android: 'com.grofers.customerapp',            socials: [{ platform: 'Twitter/X', handle: '@letsblinkit' }, { platform: 'Instagram', handle: '@letsblinkit' }] },
  zepto:     { android: 'com.zeptoconsumer',                  socials: [{ platform: 'Twitter/X', handle: '@ZeptoNow' }, { platform: 'Instagram', handle: '@zeptonow' }] },
  meesho:    { android: 'com.meesho.supply',                  socials: [{ platform: 'Twitter/X', handle: '@Meesho_App' }, { platform: 'Instagram', handle: '@meeshoapp' }] },
  ola:       { android: 'com.olacabs.customer',               socials: [{ platform: 'Twitter/X', handle: '@Olacabs' }, { platform: 'Instagram', handle: '@olacabs' }] },
  rapido:    { android: 'com.rapido.passenger',               socials: [{ platform: 'Twitter/X', handle: '@rapidobikeapp' }, { platform: 'Instagram', handle: '@rapidobikeapp' }] },
  discord:   { android: 'com.discord',                        socials: [{ platform: 'Twitter/X', handle: '@discord' }] },
  telegram:  { android: 'org.telegram.messenger',             socials: [{ platform: 'Twitter/X', handle: '@telegram' }] },
  whatsapp:  { android: 'com.whatsapp',                       socials: [{ platform: 'Twitter/X', handle: '@WhatsApp' }, { platform: 'Instagram', handle: '@whatsapp' }] },
  linkedin:  { android: 'com.linkedin.android',               socials: [{ platform: 'Twitter/X', handle: '@LinkedIn' }, { platform: 'Instagram', handle: '@linkedin' }] },
  microsoft: { android: 'com.microsoft.launcher',             socials: [{ platform: 'Twitter/X', handle: '@Microsoft' }, { platform: 'Instagram', handle: '@microsoft' }] },
  google:    { android: 'com.google.android.googlequicksearchbox', socials: [{ platform: 'Twitter/X', handle: '@Google' }, { platform: 'Instagram', handle: '@google' }] },
  samsung:   { android: 'com.samsung.android.app.tips',       socials: [{ platform: 'Twitter/X', handle: '@SamsungMobile' }, { platform: 'Instagram', handle: '@samsung' }] },
  sony:      { android: 'com.sony.playmemories.mobile',       socials: [{ platform: 'Twitter/X', handle: '@Sony' }, { platform: 'Instagram', handle: '@sony' }] },
  bigbasket: { android: 'com.bigbasket',                      socials: [{ platform: 'Twitter/X', handle: '@bigbasket_com' }, { platform: 'Instagram', handle: '@bigbasket_com' }] },
  dunzo:     { android: 'com.dunzo.user',                     socials: [{ platform: 'Twitter/X', handle: '@DunzoIt' }, { platform: 'Instagram', handle: '@dunzo' }] },
  nykaa:     { android: 'com.fsn.nykaa',                      socials: [{ platform: 'Twitter/X', handle: '@MyNykaa' }, { platform: 'Instagram', handle: '@nykaa' }] },
  myntra:    { android: 'com.myntra.android',                 socials: [{ platform: 'Twitter/X', handle: '@myntra' }, { platform: 'Instagram', handle: '@myntra' }] },
  cred:      { android: 'com.dreamplug.androidapp',           socials: [{ platform: 'Twitter/X', handle: '@CRED_club' }, { platform: 'Instagram', handle: '@cred_club' }] },
  lenskart:  { android: 'com.lenskart.app',                   socials: [{ platform: 'Twitter/X', handle: '@lenskart' }, { platform: 'Instagram', handle: '@lenskart' }] },
  moj:       { android: 'in.mohalla.video',                   socials: [{ platform: 'Instagram', handle: '@mojapp.in' }] },
  sharechat: { android: 'in.mohalla.app',                     socials: [{ platform: 'Twitter/X', handle: '@ShareChat' }, { platform: 'Instagram', handle: '@sharechat_app' }] },
  hotstar:   { android: 'in.startv.hotstar',                  socials: [{ platform: 'Twitter/X', handle: '@DisneyPlusHS' }, { platform: 'Instagram', handle: '@disneyplushotstar' }] },
  jio:       { android: 'com.jio.myjio',                      socials: [{ platform: 'Twitter/X', handle: '@JioCare' }, { platform: 'Instagram', handle: '@reliancejio' }] },
  adobe:     { android: 'com.adobe.reader',                   socials: [{ platform: 'Twitter/X', handle: '@Adobe' }, { platform: 'Instagram', handle: '@adobe' }] },
  canva:     { android: 'com.canva.editor',                   socials: [{ platform: 'Twitter/X', handle: '@canva' }, { platform: 'Instagram', handle: '@canva' }] },
  zoom:      { android: 'us.zoom.videomeetings',              socials: [{ platform: 'Twitter/X', handle: '@zoom' }, { platform: 'Instagram', handle: '@zoom' }] },
  notion:    { android: 'notion.id',                          socials: [{ platform: 'Twitter/X', handle: '@NotionHQ' }, { platform: 'Instagram', handle: '@notionhq' }] },
  duolingo:  { android: 'com.duolingo',                       socials: [{ platform: 'Twitter/X', handle: '@duolingo' }, { platform: 'Instagram', handle: '@duolingo' }] },
  byju:      { android: 'com.byjus.thelearningapp',           socials: [{ platform: 'Twitter/X', handle: '@BYJUS_Classes' }, { platform: 'Instagram', handle: '@byjus.learning' }] },
  sharechat: { android: 'in.mohalla.app',                     socials: [{ platform: 'Twitter/X', handle: '@ShareChat' }] },
}

/**
 * Main export: fetches app metadata for the given app name.
 * Returns: { appName, iosAppId, androidPackage, developer, iconUrl, socials }
 */
export async function fetchAppMetadata(appName) {
  const raw = appName.trim()
  if (!raw || raw.length < 2) return null

  const key = raw.toLowerCase()

  // Return cached result
  if (cache.has(key)) {
    console.log('[appAutofill] Cache hit:', key)
    return cache.get(key)
  }

  console.log('[appAutofill] Fetching for:', raw)

  // 1. Call iTunes Search API (CORS-allowed directly from browser)
  let iosAppId = null
  let appName_resolved = raw
  let developer = null
  let iconUrl = null

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(raw)}&entity=software&limit=5&country=in`
    console.log('[appAutofill] iTunes URL:', url)
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      console.log('[appAutofill] iTunes results count:', json.resultCount)
      if (json.results && json.results.length > 0) {
        const app = json.results[0]
        iosAppId = `id${app.trackId}`
        appName_resolved = app.trackName
        developer = app.artistName
        iconUrl = app.artworkUrl100
        console.log('[appAutofill] iTunes found:', { iosAppId, appName_resolved, developer })
      }
    }
  } catch (err) {
    console.warn('[appAutofill] iTunes fetch error:', err.message)
  }

  // 2. Enrich with Android package + socials from known map
  // Try exact match first, then partial match
  let known = KNOWN_PACKAGES[key]
  if (!known) {
    const partialKey = Object.keys(KNOWN_PACKAGES).find(
      k => key.includes(k) || k.includes(key)
    )
    known = partialKey ? KNOWN_PACKAGES[partialKey] : null
    if (known) console.log('[appAutofill] Partial match:', partialKey)
  } else {
    console.log('[appAutofill] Exact match in KNOWN_PACKAGES:', key)
  }

  // 3. Build final result
  const result = {
    appName: appName_resolved,
    iosAppId: iosAppId,
    androidPackage: known?.android || null,
    developer: developer,
    iconUrl: iconUrl,
    socials: known?.socials || generateFallbackHandles(raw, appName_resolved, developer),
  }

  console.log('[appAutofill] Final result:', result)

  // Cache if we got at least one useful piece of data
  if (result.iosAppId || result.androidPackage) {
    cache.set(key, result)
  }

  return result
}

/**
 * Generates smart fallback social handle suggestions for apps not in KNOWN_PACKAGES.
 * Uses the app name to produce plausible Twitter/Instagram handles.
 * Marked as 'suggested' so the UI can indicate they need verification.
 */
function generateFallbackHandles(rawQuery, resolvedName, developer) {
  // Clean the name to a usable handle: remove spaces, special chars, lowercase
  const base = (resolvedName || rawQuery)
    .replace(/[^a-zA-Z0-9]/g, '')  // strip spaces and symbols
    .toLowerCase()
    .slice(0, 20)                   // max handle length

  if (!base || base.length < 2) return []

  return [
    { platform: 'Twitter/X',  handle: `@${base}`, suggested: true },
    { platform: 'Instagram',  handle: `@${base}`, suggested: true },
  ]
}


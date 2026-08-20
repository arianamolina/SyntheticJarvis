/**
 * mock-api.js — Synthetic TrendMiner API
 * ─────────────────────────────────────────────────────────────────────────────
 * To connect to real TrendMiner: replace fetchTag() and fetchTagHistory()
 * with real fetch() calls. Everything else stays the same.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function rngBetween(rng, min, max) { return min + rng() * (max - min); }
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return Math.abs(h);
}

// ── Site definitions ──────────────────────────────────────────────────────────
const SWISS_SITES = {
  'Avenches':           { product: 'Café',                brand: 'Nespresso, Starbucks',  canton: 'VD', baseline: 480,  mix: { e: 0.65, g: 0.25, s: 0.10 } },
  'Bâle':               { product: 'Produits culinaires', brand: 'Thomy',                 canton: 'BS', baseline: 320,  mix: { e: 0.70, g: 0.20, s: 0.10 } },
  'Broc':               { product: 'Chocolat',            brand: 'Cailler',               canton: 'FR', baseline: 560,  mix: { e: 0.55, g: 0.30, s: 0.15 } },
  'Henniez':            { product: 'Eau & Boissons',      brand: 'Henniez, Nestea',        canton: 'VD', baseline: 290,  mix: { e: 0.80, g: 0.10, s: 0.10 } },
  'Konolfingen':        { product: 'Nutrition infantile', brand: 'BEBA Bio, Alfamino',     canton: 'BE', baseline: 410,  mix: { e: 0.60, g: 0.25, s: 0.15 } },
  'Manno':              { product: 'Huiles spécialisées', brand: 'Sofinol',                canton: 'TI', baseline: 180,  mix: { e: 0.75, g: 0.15, s: 0.10 } },
  'Orbe':               { product: 'Café',                brand: 'Nescafé, Nespresso',    canton: 'VD', baseline: 620,  mix: { e: 0.65, g: 0.25, s: 0.10 } },
  'Romont':             { product: 'Café',                brand: 'Nespresso, Starbucks',  canton: 'FR', baseline: 390,  mix: { e: 0.70, g: 0.20, s: 0.10 } },
  'Wangen bei Olten':   { product: 'Pâtes fraîches',      brand: 'Leisi',                 canton: 'SO', baseline: 240,  mix: { e: 0.60, g: 0.30, s: 0.10 } },
};

const KARAWANG_AHUS    = [1, 2, 3, 4, 5, 8, '9_1', '9_2', 10];
const KARAWANG_PANELS  = ['LV01','LV02','LV03','LV04','LV05','LV06'];
const SWISS_PANELS     = ['LV01','LV02','LV03','LV04','LV05','LV06'];
const SWISS_AHUS       = [1, 2, 3, 4, 5, 8, '9_1', '9_2', 10];

// ── Tag value generators ──────────────────────────────────────────────────────
function tagValue(tagName, rng) {
  // AHU tags
  if (tagName.includes('.AHU')) {
    const m = tagName.split('.').pop();
    if (m === 'ROOM_TEMP')    return +rngBetween(rng, 17,   25  ).toFixed(1);
    if (m === 'ROOM_HUMID')   return +rngBetween(rng, 40,   65  ).toFixed(1);
    if (m === 'ROOM_PRESS')   return +rngBetween(rng, 3,    22  ).toFixed(1);
    if (m === 'SUPPLY_TEMP')  return +rngBetween(rng, 12,   18  ).toFixed(1);
    if (m === 'COOLING_KW')   return +rngBetween(rng, 10,   85  ).toFixed(1);
    if (m === 'HEATING_KW')   return +rngBetween(rng, 0,    30  ).toFixed(1);
    if (m === 'EFFICIENCY')   return +rngBetween(rng, 55,   98  ).toFixed(1);
    if (m === 'DAILY_COST')   return +rngBetween(rng, 80,   420 ).toFixed(0);
    if (m === 'COP')          return +rngBetween(rng, 2.2,  4.8 ).toFixed(2);
  }
  // LV tags
  if (tagName.includes('.LV')) {
    const m = tagName.split('.').pop();
    if (m === 'POWER_FACTOR')     return +rngBetween(rng, 0.72, 0.99).toFixed(3);
    if (m === 'THD')              return +rngBetween(rng, 1.5,  16  ).toFixed(1);
    if (m === 'LOAD_FACTOR')      return +rngBetween(rng, 0.48, 0.91).toFixed(3);
    if (m === 'ENERGY_INTENSITY') return +rngBetween(rng, 0.8,  3.2 ).toFixed(2);
    if (m === 'OPERATING_COST')   return +rngBetween(rng, 200,  2200).toFixed(0);
    if (m === 'SAVINGS')          return +rngBetween(rng, -300, 400 ).toFixed(0);
  }
  // MWh per energy type
  if (tagName.endsWith('.ELEC')) return +rngBetween(rng, 80,  500).toFixed(1);
  if (tagName.endsWith('.GAS'))  return +rngBetween(rng, 20,  200).toFixed(1);
  if (tagName.endsWith('.STEAM'))return +rngBetween(rng, 10,  100).toFixed(1);
  return +rngBetween(rng, 0, 100).toFixed(2);
}

// ── Core fetch (swap this for real TrendMiner fetch) ──────────────────────────
async function fetchTag(tagName) {
  await new Promise(r => setTimeout(r, 2 + Math.random() * 15));
  const rng = seededRng(hashStr(tagName) + Math.floor(Date.now() / 60000));
  return {
    tagName,
    value:     tagValue(tagName, rng),
    timestamp: new Date().toISOString(),
    quality:   'Good',
    source:    'AVEVA_PI_HISTORIAN',
  };
}

// ── History fetch ─────────────────────────────────────────────────────────────
// period: 'today' | '5days' | 'month' | '5months' | 'year'
async function fetchSiteEnergyHistory(siteKey, period) {
  await new Promise(r => setTimeout(r, 10 + Math.random() * 30));
  const info  = SWISS_SITES[siteKey] || { baseline: 400, mix: { e: 0.65, g: 0.25, s: 0.10 } };
  const base  = info.baseline;
  const rng   = seededRng(hashStr(siteKey + period));
  const now   = new Date();
  const points = [];

  let intervals, labelFn, stepMs;
  switch (period) {
    case 'today':
      intervals = 24;
      stepMs    = 3600000;
      labelFn   = (d) => `${d.getHours()}:00`;
      break;
    case '5days':
      intervals = 5;
      stepMs    = 86400000;
      labelFn   = (d) => d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
      break;
    case 'month':
      intervals = 30;
      stepMs    = 86400000;
      labelFn   = (d) => d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
      break;
    case '5months':
      intervals = 5;
      stepMs    = 30 * 86400000;
      labelFn   = (d) => d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      break;
    case 'year':
      intervals = 12;
      stepMs    = 30 * 86400000;
      labelFn   = (d) => d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      break;
    default:
      intervals = 6;
      stepMs    = 30 * 86400000;
      labelFn   = (d) => d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
  }

  // scale base to interval
  const scale = stepMs / (30 * 86400000);

  for (let i = intervals - 1; i >= 0; i--) {
    const d      = new Date(now.getTime() - i * stepMs);
    const factor = 1 + (rng() - 0.5) * 0.3;
    const total  = base * scale * factor;
    points.push({
      label:     labelFn(d),
      timestamp: d.toISOString(),
      elec:      +(total * info.mix.e).toFixed(1),
      gas:       +(total * info.mix.g).toFixed(1),
      steam:     +(total * info.mix.s).toFixed(1),
    });
  }
  return points;
}

async function fetchSwissHistory(cfg) {
  const history = {};
  for (const site of Object.keys(SWISS_SITES)) {
    const rng = seededRng(hashStr(site + '_hist'));
    const points = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const factor = 1 + (-0.012 * (6 - i)) + Math.sin((6 - i) / 2) * 0.08 + (rng() - 0.5) * 0.14;
      points.push({ timestamp: d.toISOString(), value: +(SWISS_SITES[site].baseline * factor).toFixed(1) });
    }
    history[site] = points;
  }
  return history;
}

// ── Site-level data fetchers ──────────────────────────────────────────────────
async function fetchAllSwissSites(cfg) {
  const results = [];
  for (const [site, info] of Object.entries(SWISS_SITES)) {
    const key  = site.replace(/\s/g,'_').replace(/[âä]/g,'a').replace(/[éê]/g,'e');
    const elec = await fetchTag(`SWISS.${key}.ELEC`);
    const gas  = await fetchTag(`SWISS.${key}.GAS`);
    const steam= await fetchTag(`SWISS.${key}.STEAM`);
    const mwh  = +(elec.value + gas.value + steam.value).toFixed(1);
    const base = info.baseline;
    const pct  = +((mwh - base) / base * 100).toFixed(1);
    const co2e = +(elec.value * cfg.emissionFactors.swissElectricity +
                   gas.value  * cfg.emissionFactors.gas +
                   steam.value* cfg.emissionFactors.steam).toFixed(1);
    const savingsChf = +Math.max(0, (base - mwh) * cfg.energyPrice * 1000).toFixed(0);
    results.push({
      site, mwh, baseline: base, pct, co2e, savingsChf,
      elec: elec.value, gas: gas.value, steam: steam.value,
      product: info.product, brand: info.brand, canton: info.canton,
      status: pct > 8 ? 'Anomaly' : pct > 2 ? 'Review' : 'Normal',
      timestamp: elec.timestamp,
    });
  }
  return results;
}

async function fetchSiteLVPanels(siteKey, cfg) {
  const panels = [];
  for (const panel of SWISS_PANELS) {
    const base = `SITE.${hashStr(siteKey)}.${panel}`;
    const [pf, thd, lf, ei, cost, sav] = await Promise.all([
      fetchTag(`${base}.POWER_FACTOR`),
      fetchTag(`${base}.THD`),
      fetchTag(`${base}.LOAD_FACTOR`),
      fetchTag(`${base}.ENERGY_INTENSITY`),
      fetchTag(`${base}.OPERATING_COST`),
      fetchTag(`${base}.SAVINGS`),
    ]);
    const pfS  = pf.value  >= cfg.kpiThresholds.powerFactorMin ? 'Good' : pf.value  >= 0.85 ? 'Warning' : 'Critical';
    const thdS = thd.value <= cfg.kpiThresholds.thdMax          ? 'Good' : thd.value <= 12   ? 'Warning' : 'Critical';
    const lfS  = lf.value  >= cfg.kpiThresholds.loadFactorMin   ? 'Good' : 'Warning';
    panels.push({ panel, powerFactor: pf.value, thd: thd.value, loadFactor: lf.value,
      energyIntensity: ei.value, operatingCost: +cost.value, savings: +sav.value,
      pfStatus: pfS, thdStatus: thdS, lfStatus: lfS });
  }
  return panels;
}

async function fetchSiteAHUs(siteKey, cfg) {
  const results = [];
  for (const ahuId of SWISS_AHUS) {
    const base = `SITE.${hashStr(siteKey)}.AHU${ahuId}`;
    const [temp, humid, press, supplyTemp, coolingKw, heatingKw, eff, cost, cop] = await Promise.all([
      fetchTag(`${base}.ROOM_TEMP`),
      fetchTag(`${base}.ROOM_HUMID`),
      fetchTag(`${base}.ROOM_PRESS`),
      fetchTag(`${base}.SUPPLY_TEMP`),
      fetchTag(`${base}.COOLING_KW`),
      fetchTag(`${base}.HEATING_KW`),
      fetchTag(`${base}.EFFICIENCY`),
      fetchTag(`${base}.DAILY_COST`),
      fetchTag(`${base}.COP`),
    ]);
    const tempOk  = temp.value  >= cfg.ahuTargets.tempMin  && temp.value  <= cfg.ahuTargets.tempMax;
    const humidOk = humid.value >= cfg.ahuTargets.humidMin && humid.value <= cfg.ahuTargets.humidMax;
    const pressOk = press.value >= cfg.ahuTargets.pressMin && press.value <= cfg.ahuTargets.pressMax;
    const effOk   = eff.value   >= cfg.kpiThresholds.ahuEffMin;
    const pass    = [tempOk, humidOk, pressOk, effOk].filter(Boolean).length;
    const health  = pass === 4 ? 'PASS' : pass >= 2 ? 'WARN' : 'FAIL';
    const dailyMwh= (coolingKw.value + heatingKw.value) * 24 / 1000;
    const co2Daily= +(dailyMwh * cfg.emissionFactors.swissElectricity).toFixed(2);
    results.push({ id: `AHU${ahuId}`, roomTemp: temp.value, roomHumid: humid.value,
      roomPress: press.value, supplyTemp: supplyTemp.value, coolingKw: coolingKw.value,
      heatingKw: heatingKw.value, efficiency: eff.value, dailyCostChf: cost.value,
      cop: cop.value, co2Daily, health, tempOk, humidOk, pressOk, effOk });
  }
  return results;
}

async function fetchAllAHUs(cfg) { return fetchSiteAHUs('KARAWANG', cfg); }
async function fetchAllLVPanels(cfg) {
  const panels = [];
  for (const panel of KARAWANG_PANELS) {
    const base = `KRW.${panel}`;
    const [pf, thd, lf, ei, cost, sav] = await Promise.all([
      fetchTag(`${base}.POWER_FACTOR`), fetchTag(`${base}.THD`),
      fetchTag(`${base}.LOAD_FACTOR`),  fetchTag(`${base}.ENERGY_INTENSITY`),
      fetchTag(`${base}.OPERATING_COST`),fetchTag(`${base}.SAVINGS`),
    ]);
    const pfS  = pf.value  >= 0.95 ? 'Good' : pf.value  >= 0.85 ? 'Warning' : 'Critical';
    const thdS = thd.value <= 8    ? 'Good' : thd.value <= 12   ? 'Warning' : 'Critical';
    const lfS  = lf.value  >= 0.55 ? 'Good' : 'Warning';
    panels.push({ panel, powerFactor: pf.value, thd: thd.value, loadFactor: lf.value,
      energyIntensity: ei.value, operatingCost: +cost.value, savings: +sav.value,
      pfStatus: pfS, thdStatus: thdS, lfStatus: lfS });
  }
  return panels;
}

window.TrendMinerAPI = {
  fetchTag, fetchTagHistory: fetchSiteEnergyHistory,
  fetchAllSwissSites, fetchSwissHistory,
  fetchSiteLVPanels, fetchSiteAHUs,
  fetchAllAHUs, fetchAllLVPanels,
  SWISS_SITES, KARAWANG_AHUS, KARAWANG_PANELS,
};

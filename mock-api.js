/**
 * mock-api.js — Synthetic TrendMiner API
 * ─────────────────────────────────────────────────────────────────────────────
 * Mimics TrendMiner REST API response shapes exactly.
 * To connect to real TrendMiner: replace the body of fetchTag() and
 * fetchTagHistory() with real fetch() calls to your TrendMiner instance.
 * Everything else in the dashboard stays the same.
 *
 * Real TrendMiner endpoint shape (for reference):
 *   GET /api/v1/tags/{tagName}/latest
 *   GET /api/v1/tags/{tagName}/history?start=...&end=...
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Seeded random (reproducible fake data) ───────────────────────────────────
function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randBetween(rng, min, max) {
  return min + rng() * (max - min);
}

// ── Tag registry — maps tag names to realistic value generators ───────────────
// Swiss sites: energy consumption in MWh
const SWISS_SITES = {
  Avenches:         { product: "Café",                brand: "Nespresso, Starbucks", canton: "VD", baseline: 480, energyMix: { electricity: 0.65, gas: 0.25, steam: 0.10 } },
  "Bâle":           { product: "Produits culinaires", brand: "Thomy",                canton: "BS", baseline: 320, energyMix: { electricity: 0.70, gas: 0.20, steam: 0.10 } },
  Broc:             { product: "Chocolat",            brand: "Cailler",              canton: "FR", baseline: 560, energyMix: { electricity: 0.55, gas: 0.30, steam: 0.15 } },
  Henniez:          { product: "Eau & Boissons",      brand: "Henniez, Nestea",      canton: "VD", baseline: 290, energyMix: { electricity: 0.80, gas: 0.10, steam: 0.10 } },
  Konolfingen:      { product: "Nutrition infantile", brand: "BEBA Bio, Alfamino",   canton: "BE", baseline: 410, energyMix: { electricity: 0.60, gas: 0.25, steam: 0.15 } },
  Manno:            { product: "Huiles spécialisées", brand: "Sofinol",              canton: "TI", baseline: 180, energyMix: { electricity: 0.75, gas: 0.15, steam: 0.10 } },
  Orbe:             { product: "Café",                brand: "Nescafé, Nespresso",   canton: "VD", baseline: 620, energyMix: { electricity: 0.65, gas: 0.25, steam: 0.10 } },
  Romont:           { product: "Café",                brand: "Nespresso, Starbucks", canton: "FR", baseline: 390, energyMix: { electricity: 0.70, gas: 0.20, steam: 0.10 } },
  "Wangen bei Olten": { product: "Pâtes fraîches",   brand: "Leisi",                canton: "SO", baseline: 240, energyMix: { electricity: 0.60, gas: 0.30, steam: 0.10 } },
};

// Karawang AHUs
const KARAWANG_AHUS = [1, 2, 3, 4, 5, 8, "9_1", "9_2", 10];

// Karawang LV electrical panels
const KARAWANG_LV_PANELS = ["LV01", "LV02", "LV03", "LV04", "LV05", "LV06"];

// ── Core fake fetch functions ─────────────────────────────────────────────────

/**
 * fetchTag(tagName) — returns the latest value for a tag.
 * Shape matches TrendMiner GET /api/v1/tags/{tagName}/latest
 */
async function fetchTag(tagName, seedOffset = 0) {
  // Simulate network latency (5–30ms)
  await new Promise(r => setTimeout(r, 5 + Math.random() * 25));

  const rng = seededRand(hashCode(tagName) + seedOffset + Math.floor(Date.now() / 60000));
  const value = generateTagValue(tagName, rng);

  return {
    tagName,
    value,
    unit: getTagUnit(tagName),
    timestamp: new Date().toISOString(),
    quality: rng() > 0.02 ? "Good" : "Uncertain", // 2% chance of uncertain quality
    source: "AVEVA_PI_HISTORIAN",
  };
}

/**
 * fetchTagHistory(tagName, periodMonths) — returns historical trend data.
 * Shape matches TrendMiner GET /api/v1/tags/{tagName}/history
 */
async function fetchTagHistory(tagName, periodMonths = 6) {
  await new Promise(r => setTimeout(r, 10 + Math.random() * 40));

  const points = [];
  const now = new Date();
  const rng = seededRand(hashCode(tagName + "_history"));

  for (let i = periodMonths; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const trend = 1 + (-0.012 * (periodMonths - i)) + Math.sin((periodMonths - i) / 2) * 0.08 + (rng() - 0.5) * 0.14;
    const value = generateTagValue(tagName, rng, trend);
    points.push({
      timestamp: date.toISOString(),
      value,
      quality: "Good",
    });
  }

  return {
    tagName,
    unit: getTagUnit(tagName),
    history: points,
    source: "AVEVA_PI_HISTORIAN",
  };
}

// ── Tag value generators ──────────────────────────────────────────────────────

function generateTagValue(tagName, rng, trendFactor = 1) {
  // Swiss site MWh consumption
  for (const [site, info] of Object.entries(SWISS_SITES)) {
    if (tagName === `SWISS.${site.replace(/\s/g, "_").replace(/â/g, "a").replace(/é/g, "e")}.MWH`) {
      return parseFloat((info.baseline * trendFactor * (0.85 + rng() * 0.3)).toFixed(1));
    }
  }

  // AHU tags
  if (tagName.startsWith("KRW.AHU")) {
    const metric = tagName.split(".").pop();
    switch (metric) {
      case "ROOM_TEMP":    return parseFloat(randBetween(rng, 17, 25).toFixed(1));
      case "ROOM_HUMID":   return parseFloat(randBetween(rng, 40, 65).toFixed(1));
      case "ROOM_PRESS":   return parseFloat(randBetween(rng, 3, 22).toFixed(1));
      case "SUPPLY_TEMP":  return parseFloat(randBetween(rng, 12, 18).toFixed(1));
      case "COOLING_KW":   return parseFloat(randBetween(rng, 10, 85).toFixed(1));
      case "HEATING_KW":   return parseFloat(randBetween(rng, 0, 30).toFixed(1));
      case "EFFICIENCY":   return parseFloat(randBetween(rng, 55, 98).toFixed(1));
      case "DAILY_COST":   return parseFloat(randBetween(rng, 80, 420).toFixed(0));
      case "COP":          return parseFloat(randBetween(rng, 2.2, 4.8).toFixed(2));
      default:             return parseFloat(randBetween(rng, 0, 100).toFixed(2));
    }
  }

  // LV panel tags
  if (tagName.startsWith("KRW.LV")) {
    const metric = tagName.split(".").pop();
    switch (metric) {
      case "POWER_FACTOR":      return parseFloat(randBetween(rng, 0.72, 0.99).toFixed(3));
      case "THD":               return parseFloat(randBetween(rng, 1.5, 16).toFixed(1));
      case "LOAD_FACTOR":       return parseFloat(randBetween(rng, 0.48, 0.91).toFixed(3));
      case "ENERGY_INTENSITY":  return parseFloat(randBetween(rng, 0.8, 3.2).toFixed(2));
      case "OPERATING_COST":    return parseFloat(randBetween(rng, 200, 2200).toFixed(0));
      case "SAVINGS":           return parseFloat(randBetween(rng, -300, 400).toFixed(0));
      case "ACTIVE_POWER":      return parseFloat(randBetween(rng, 50, 800).toFixed(1));
      case "REACTIVE_POWER":    return parseFloat(randBetween(rng, 10, 200).toFixed(1));
      default:                  return parseFloat(randBetween(rng, 0, 100).toFixed(2));
    }
  }

  return parseFloat(randBetween(rng, 0, 100).toFixed(2));
}

function getTagUnit(tagName) {
  if (tagName.endsWith("MWH"))             return "MWh";
  if (tagName.endsWith("ROOM_TEMP"))       return "°C";
  if (tagName.endsWith("SUPPLY_TEMP"))     return "°C";
  if (tagName.endsWith("ROOM_HUMID"))      return "%";
  if (tagName.endsWith("ROOM_PRESS"))      return "Pa";
  if (tagName.endsWith("COOLING_KW"))      return "kW";
  if (tagName.endsWith("HEATING_KW"))      return "kW";
  if (tagName.endsWith("EFFICIENCY"))      return "%";
  if (tagName.endsWith("DAILY_COST"))      return "CHF";
  if (tagName.endsWith("COP"))             return "";
  if (tagName.endsWith("POWER_FACTOR"))    return "";
  if (tagName.endsWith("THD"))             return "%";
  if (tagName.endsWith("LOAD_FACTOR"))     return "";
  if (tagName.endsWith("ENERGY_INTENSITY"))return "kWh/m³";
  if (tagName.endsWith("OPERATING_COST")) return "CHF";
  if (tagName.endsWith("SAVINGS"))         return "CHF";
  if (tagName.endsWith("ACTIVE_POWER"))    return "kW";
  if (tagName.endsWith("REACTIVE_POWER"))  return "kVAr";
  return "";
}

// ── High-level data fetchers (called by dashboard) ───────────────────────────

async function fetchAllSwissSites(cfg) {
  const results = [];
  for (const [site, info] of Object.entries(SWISS_SITES)) {
    const tag = `SWISS.${site.replace(/\s/g, "_").replace(/â/g, "a").replace(/é/g, "e")}.MWH`;
    const latest = await fetchTag(tag);
    const mwh = latest.value;
    const baseline = info.baseline;
    const pct = parseFloat(((mwh - baseline) / baseline * 100).toFixed(1));

    // CO₂ calculation using config emission factors
    const co2e = parseFloat((
      mwh * info.energyMix.electricity * cfg.emissionFactors.swissElectricity +
      mwh * info.energyMix.gas         * cfg.emissionFactors.gas +
      mwh * info.energyMix.steam       * cfg.emissionFactors.steam
    ).toFixed(1));

    const savingsChf = parseFloat(Math.max(0, (baseline - mwh) * cfg.energyPrice * 1000).toFixed(0));

    results.push({
      site,
      mwh,
      baseline,
      pct,
      co2e,
      savingsChf,
      product: info.product,
      brand: info.brand,
      canton: info.canton,
      energyMix: info.energyMix,
      status: pct > 8 ? "Anomaly" : pct > 2 ? "Review" : "Normal",
      timestamp: latest.timestamp,
      quality: latest.quality,
    });
  }
  return results;
}

async function fetchSwissHistory(cfg) {
  const history = {};
  for (const site of Object.keys(SWISS_SITES)) {
    const tag = `SWISS.${site.replace(/\s/g, "_").replace(/â/g, "a").replace(/é/g, "e")}.MWH`;
    const result = await fetchTagHistory(tag, 6);
    history[site] = result.history;
  }
  return history;
}

async function fetchAllAHUs(cfg) {
  const results = [];
  for (const ahuId of KARAWANG_AHUS) {
    const base = `KRW.AHU${ahuId}`;
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

    const tempOk   = temp.value  >= cfg.ahuTargets.tempMin    && temp.value  <= cfg.ahuTargets.tempMax;
    const humidOk  = humid.value >= cfg.ahuTargets.humidMin   && humid.value <= cfg.ahuTargets.humidMax;
    const pressOk  = press.value >= cfg.ahuTargets.pressMin   && press.value <= cfg.ahuTargets.pressMax;
    const effOk    = eff.value   >= cfg.kpiThresholds.ahuEffMin;
    const passCount = [tempOk, humidOk, pressOk, effOk].filter(Boolean).length;
    const health = passCount === 4 ? "PASS" : passCount >= 2 ? "WARN" : "FAIL";

    // CO₂ for Karawang uses Indonesian grid factor
    const dailyMwh = (coolingKw.value + heatingKw.value) * 24 / 1000;
    const co2Daily = parseFloat((dailyMwh * cfg.emissionFactors.indonesianElectricity).toFixed(2));

    results.push({
      id: `AHU${ahuId}`,
      roomTemp:   temp.value,
      roomHumid:  humid.value,
      roomPress:  press.value,
      supplyTemp: supplyTemp.value,
      coolingKw:  coolingKw.value,
      heatingKw:  heatingKw.value,
      efficiency: eff.value,
      dailyCostChf: cost.value,
      cop:        cop.value,
      co2Daily,
      health,
      tempOk, humidOk, pressOk, effOk,
      timestamp:  temp.timestamp,
    });
  }
  return results;
}

async function fetchAllLVPanels(cfg) {
  const results = [];
  for (const panel of KARAWANG_LV_PANELS) {
    const base = `KRW.${panel}`;
    const [pf, thd, lf, ei, cost, savings, activePwr, reactivePwr] = await Promise.all([
      fetchTag(`${base}.POWER_FACTOR`),
      fetchTag(`${base}.THD`),
      fetchTag(`${base}.LOAD_FACTOR`),
      fetchTag(`${base}.ENERGY_INTENSITY`),
      fetchTag(`${base}.OPERATING_COST`),
      fetchTag(`${base}.SAVINGS`),
      fetchTag(`${base}.ACTIVE_POWER`),
      fetchTag(`${base}.REACTIVE_POWER`),
    ]);

    const pfStatus  = pf.value  >= cfg.kpiThresholds.powerFactorMin ? "Good" : pf.value >= 0.85 ? "Warning" : "Critical";
    const thdStatus = thd.value <= cfg.kpiThresholds.thdMax          ? "Good" : thd.value <= 12  ? "Warning" : "Critical";
    const lfStatus  = lf.value  >= cfg.kpiThresholds.loadFactorMin   ? "Good" : "Warning";

    results.push({
      panel,
      powerFactor:     pf.value,
      thd:             thd.value,
      loadFactor:      lf.value,
      energyIntensity: ei.value,
      operatingCost:   cost.value,
      savings:         savings.value,
      activePower:     activePwr.value,
      reactivePower:   reactivePwr.value,
      pfStatus, thdStatus, lfStatus,
      timestamp: pf.timestamp,
    });
  }
  return results;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.TrendMinerAPI = {
  fetchTag,
  fetchTagHistory,
  fetchAllSwissSites,
  fetchSwissHistory,
  fetchAllAHUs,
  fetchAllLVPanels,
  SWISS_SITES,
  KARAWANG_AHUS,
  KARAWANG_LV_PANELS,
};

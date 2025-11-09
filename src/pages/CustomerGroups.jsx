// CustomerGroups.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";
import suvPoints from "./data/suv_points.json";
import puPoints from "./data/pu_points.json";
import midSuvPoints from "./data/mid_suv_points.json";
import largePuPoints from "./data/large_pu_points.json";
import demosMapping from "./data/demos-mapping.json";
import codeToTextMapRaw from "./data/code-to-text-map.json";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Lock, Unlock, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

/* ---- Local series palette (renamed to avoid clashing with THEME.COLORS) ---- */
const SERIES_COLORS = [
  "#1F77B4",
  "#FF7F0E",
  "#2CA02C",
  "#D62728",
  "#9467BD",
  "#8C564B",
  "#E377C2",
  "#7F7F7F",
  "#BCBD22",
  "#17BECF",
  "#F97316",
  "#14B8A6",
  "#A855F7",
  "#22C55E",
  "#3B82F6",
];

const FIXED_CLUSTER_COLORS = {
  1: "#1F77B4", // C1 blue
  2: "#FF7F0E", // C2 orange
  3: "#2CA02C", // C3 green
  4: "#D62728", // C4 red
  5: "#A855F7", // C5 purple
  6: "#FACC15", // C6 yellow
  7: "#EC4899", // C7 pink
};

const clusterColor = (k) =>
  FIXED_CLUSTER_COLORS[k] ??
  SERIES_COLORS[(Number(k) - 1 + SERIES_COLORS.length) % SERIES_COLORS.length];

const US_TOPO = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const US_STATE_ABBR_TO_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};
const US_STATE_NAME_SET = new Set(Object.values(US_STATE_ABBR_TO_NAME));

const LAYOUT = {
  topRowHeight: 620,
  subPanelMinHeight: 400,
  bottomCardHeight: 350,
};

function toStateName(labelRaw) {
  if (!labelRaw) return null;
  const s = String(labelRaw).trim();
  const up = s.toUpperCase();
  if (US_STATE_ABBR_TO_NAME[up]) return US_STATE_ABBR_TO_NAME[up];
  const lower = s.toLowerCase();
  for (const name of US_STATE_NAME_SET) {
    if (name.toLowerCase() === lower) return name;
  }
  const two = (s.match(/\b[A-Z]{2}\b/g) || []).find(
    (tok) => US_STATE_ABBR_TO_NAME[tok.toUpperCase()]
  );
  if (two) return US_STATE_ABBR_TO_NAME[two.toUpperCase()];
  return null;
}

/* ---------- Consolidated color helpers ---------- */
function parseHex(hex) {
  const h = (hex || "").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(v.slice(0, 2), 16) || 0;
  const g = parseInt(v.slice(2, 4), 16) || 0;
  const b = parseInt(v.slice(4, 6), 16) || 0;
  return { r, g, b };
}
const hexToRgbStr = (hex) => {
  const { r, g, b } = parseHex(hex);
  return `${r}, ${g}, ${b}`;
};
const isDarkHex = (hex) => {
  const { r, g, b } = parseHex(hex);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return brightness < 0.5;
};
function rgbToHex({ r, g, b }) {
  const to = (x) =>
    Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function blendHex(aHex, bHex, t) {
  const a = parseHex(aHex);
  const b = parseHex(bHex);
  return rgbToHex({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  });
}

/* ---------- Misc helpers ---------- */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/* ---------- Memoized presentational shapes ---------- */
const CentroidDot = React.memo(function CentroidDot({
  cx, cy, payload, onClick, THEME,
}) {
  const accent = THEME.accent;
  const ringFill = `${THEME.accent}22`;
  const ringStroke = `${THEME.accent}99`;
  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ cursor: "pointer" }}>
      <circle r={30} fill="transparent" onClick={() => onClick?.(payload)} />
      <circle r={22} fill={ringFill} stroke={ringStroke} strokeWidth={3}
              filter="url(#centroidGlow)" onClick={() => onClick?.(payload)} />
      <circle r={6} fill={accent} onClick={() => onClick?.(payload)} />
      <text y={-16} textAnchor="middle" fontSize={16} fontWeight={800}
            stroke={THEME.bg} strokeWidth={3} paintOrder="stroke fill"
            style={{ pointerEvents: "none" }}>
        {`C${payload.cluster}`}
      </text>
      <text y={-16} textAnchor="middle" fontSize={16} fontWeight={800}
            fill={THEME.text} style={{ pointerEvents: "none" }}>
        {`C${payload.cluster}`}
      </text>
    </g>
  );
});
const BigDot = React.memo(function BigDot({ cx, cy, fill }) {
  return <circle cx={cx} cy={cy} r={10} fill={fill} />;
});
const TinyDot = React.memo(function TinyDot({ cx, cy, fill }) {
  return <circle cx={cx} cy={cy} r={5} fill={fill} />;
});

/* ---------- Domains & animation helpers ---------- */
function paddedDomain(vals) {
  if (!vals.length) return [0, 1];
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const eps = Math.abs(min || 1) * 0.05;
    min -= eps;
    max += eps;
  }
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
function tweenDomain(from, to, t) {
  const [f0, f1] = from;
  const [t0, t1] = to;
  const e = easeInOutQuad(t);
  return [f0 + (t0 - f0) * e, f1 + (t1 - f1) * e];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function percentPaddedDomain(values) {
  if (!values || values.length === 0) return [0, 100];
  const finiteVals = values.filter((v) => Number.isFinite(v));
  if (finiteVals.length === 0) return [0, 100];
  let min = Math.min(...finiteVals);
  let max = Math.max(...finiteVals);
  if (min === max) {
    const eps = Math.max(1, Math.abs(min) * 0.05);
    min -= eps;
    max += eps;
  } else {
    const pad = (max - min) * 0.05;
    min -= pad;
    max += pad;
  }
  min = clamp(min, 0, 100);
  max = clamp(max, 0, 100);
  return [Math.floor(min), Math.ceil(max)];
}

const STATE_KEYS = [
  "ADMARK_STATE", "admark_state", "STATE", "State", "state",
  "DM_STATE", "DM_STATE_CODE", "STATE_ABBR", "state_abbr", "ST", "st",
];

/* ---------- Personas ---------- */
const PERSONA_BY_CLUSTER = {
  0: {
    title: "C0 • Practical Commuters",
    summary:
      "Budget-conscious, prioritize reliability and total cost of ownership. Commute-focused, low appetite for premium options.",
    bullets: [
      "Top motivations: Value, reliability, low monthly payment",
      "Demographics: Skews 35–54, suburbs, mixed households",
      "Prefers: Advanced safety over performance packages",
      "Channel: Responds to straightforward price/value messaging",
    ],
  },

  1: {
    title: "The Everyday Explorer",
    summary: (
      <>
        <strong>Loyalty, capability, and value.</strong> This group values freedom, comfort, and practicality and want
         vehicles that fit an active, hands-on lifestyle. Mostly men in 
        their mid-50s to mid-70s living in suburban or small-town settings, they are often semi-retired or in 
        mid-management roles. They’re loyal to brands that align with their values and prioritize durability, 
        practicality, and value for money, even if the model is a little more expensive.
      </>
    ),
  },

  2: {
    title: "The Discerning Driver",
    summary:
      "Affluent, style-driven suburban drivers. They seek luxury, performance, and safety over loyalty to any brand. They prefer European and Asian vehicles with AWD, strong handling, and refined design, valuing prestige and reliability as symbols of success. Confident and discerning, they’re willing to spend more for features that deliver comfort, power, and peace of mind.",
  },
  default: {
    title: "Cluster Persona",
    summary:
      "Audience profile for this cluster. Customize with your internal notes, key stats, and recommended messaging.",
    bullets: ["Motivations: …", "Demographics: …", "Preferred features: …", "Go-to channels: …"],
  },
};
function getPersonaForCluster(id) {
  return PERSONA_BY_CLUSTER[id] ?? PERSONA_BY_CLUSTER.default;
}

/* ---------- Field groups ---------- */
const FIELD_GROUPS = {
  Demographics: [
    "DEMO_GENDER1", "BLD_AGE_GRP", "GENERATION_GRP", "DEMO_MARITAL", "BLD_CHILDREN",
    "DEMO_LOCATION", "DEMO_EMPLOY", "DEMO_INCOME_BUCKET", "DEMO_EDUCATION", "BLD_HOBBY1_GRP",
  ],
  Financing: [
    "FIN_PRICE_UNEDITED", "BLD_FIN_TOTAL_MONPAY", "FIN_PU_DOWN_PAY", "FIN_PU_TRADE_IN",
    "FIN_LE_LENGTH", "FIN_PU_LENGTH", "C1_PL", "FIN_CREDIT",
  ],
  "Buying Behavior": ["PR_MOST", "C2S_MODEL_RESPONSE", "SRC_TOP1"],
  Loyalty: [
    "OL_MODEL_GRP", "STATE_BUY_BEST", "STATE_CONTINUE", "STATE_FEEL_GOOD", "STATE_REFER",
    "STATE_PRESTIGE", "STATE_EURO", "STATE_AMER", "STATE_ASIAN", "STATE_SWITCH_FEAT", "STATE_VALUES",
  ],
  "Willingness to Pay": [
    "PV_TAX_INS", "PV_SPEND_LUXURY", "PV_PRESTIGE", "PV_QUALITY", "PV_RESALE",
    "PV_INEXP_MAINTAIN", "PV_AVOID", "PV_SURVIVE", "PV_PAY_MORE", "PV_BREAKDOWN",
    "PV_VALUE", "PV_SPEND", "PV_LEASE", "PV_PUTOFF", "STATE_BALANCE", "STATE_WAIT",
    "STATE_ENJOY_PRESTIGE", "STATE_FIRST_YR", "STATE_NO_LOW_PRICE", "STATE_AUDIO",
    "STATE_MON_PAY", "STATE_SHOP_MANY",
  ],
};

/* ---------- Imagery options ---------- */
const IMAGERY_OPTIONS = [
  { key: "IMAGE_BOLD", label: "Bold" },
  { key: "IMAGE_CLASSIC", label: "Classic" },
  { key: "IMAGE_COMFORT", label: "Comfortable" },
  { key: "IMAGE_CONSERVATIVE", label: "Conservative" },
  { key: "IMAGE_DEPENDABLE", label: "Dependable" },
  { key: "IMAGE_DISTINCT", label: "Distinct" },
  { key: "IMAGE_ECONOMY", label: "Economical" },
  { key: "IMAGE_ELEGANT", label: "Elegant" },
  { key: "IMAGE_ENGINEER", label: "Well-Engineered" },
  { key: "IMAGE_ENVIRONMENT", label: "Environmentally-Friendly" },
  { key: "IMAGE_EXCITING", label: "Exciting" },
  { key: "IMAGE_FAMILY", label: "Family-Oriented" },
  { key: "IMAGE_FUNCTION", label: "Functional" },
  { key: "IMAGE_FUN_DRIVE", label: "Fun to Drive" },
  { key: "IMAGE_GOOD_VALUE", label: "Good Value" },
  { key: "IMAGE_INNOVATIVE", label: "Innovative" },
  { key: "IMAGE_LUXURY", label: "Luxurious" },
  { key: "IMAGE_POWER", label: "Powerful" },
  { key: "IMAGE_PRESTIGE", label: "Prestigious" },
  { key: "IMAGE_RESPONSIVE", label: "Responsive" },
  { key: "IMAGE_RUGGED", label: "Rugged/Tough" },
  { key: "IMAGE_SAFE", label: "Safe" },
  { key: "IMAGE_SIMPLE", label: "Simple" },
  { key: "IMAGE_SLEEK", label: "Sleek" },
  { key: "IMAGE_SOPHISTICATED", label: "Sophisticated" },
  { key: "IMAGE_SPORTY", label: "Sporty" },
  { key: "IMAGE_STYLE", label: "Stylish" },
  { key: "IMAGE_YOUTH", label: "Youthful" },
];

const VALUE_ORDER = {
  DEMO_GENDER1: ["Male", "Female", "Other", "Unknown"],
  BLD_AGE_GRP: [
    "20 To 24","25 To 29","30 To 34","35 To 39","40 To 44","45 To 49","50 To 54",
    "55 To 59","60 To 64","65 To 69","70 To 74","75 And Over","Unknown",
  ],
  GENERATION_GRP: [
    "Gen Z (>1994)","Millennials (1979-1994)","Gen X (1965-1978)",
    "Trailing-Edge Boomers (1960-1964)","Leading-Edge Boomers (1946-1959)","Matures (< 1946)","Unknown",
  ],
  DEMO_MARITAL: ["Married","Divorced, widowed, separated","Single, never married","Cohabitating","Unknown"],
  BLD_CHILDREN: ["None","One","Two","Three","Four","Five","Unknown"],
  DEMO_LOCATION: ["Metropolitan city","Suburban community of a larger city","Small town or rural city","Farming area","Unknown"],
  DEMO_INCOME_BUCKET: [
    "$74.9k or less","$75k-$84.9k","$85k-$99.9k","$100k-$124.9k","$125k-$149.9k",
    "$150k-$199.9k","$200k-$299.9k","$300k-$399.9k","$400k-$499.9k","500k or more","Unknown",
  ],
  DEMO_EDUCATION: [
    "Post-graduate degree","Bacheolor's/4-yr degree","Community College","Trade School",
    "High School","Grade school","Other","Unknown",
  ],
};

function coerceNumber(v) {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
function isLikelyPercentField(field) {
  return /APR|PCT|PERCENT/i.test(field);
}
function isLikelyCurrencyField(field) {
  return /DOWN|TRADE|PAY|MONPAY|PAYMENT|PRICE/i.test(field);
}
function isLikelyLengthField(field) {
  return /LENGTH/i.test(field);
}
function formatFinValue(field, n) {
  if (Number.isNaN(n)) return "—";
  if (isLikelyPercentField(field)) return `${n.toFixed(1)}%`;
  if (isLikelyCurrencyField(field)) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  if (isLikelyLengthField(field)) return `${n.toFixed(0)} mo`;
  return n.toLocaleString();
}
function coercePrice(v) {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

// ---- Linear regression helpers (least squares) ----
function linearRegressionXY(points) {
  // points: array of { x: number, y: number }
  const pts = points.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  const n = pts.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of pts) {
    sumX += x; sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = (n * sumXX - sumX * sumX);
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² = 1 - SS_res / SS_tot
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of pts) {
    const yHat = slope * x + intercept;
    ssRes += (y - yHat) * (y - yHat);
    ssTot += (y - meanY) * (y - meanY);
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

function buildTrend(points, xDomain) {
  const reg = linearRegressionXY(points);
  if (!reg || !xDomain || !Number.isFinite(xDomain[0]) || !Number.isFinite(xDomain[1])) return null;
  const [x0, x1] = xDomain[0] <= xDomain[1] ? xDomain : [xDomain[1], xDomain[0]];
  return {
    line: [
      { x: x0, y: reg.intercept + reg.slope * x0 },
      { x: x1, y: reg.intercept + reg.slope * x1 },
    ],
    r2: reg.r2,
  };
}

function insetTrendEndpoint(trend, xDomain, yDomain, xPct = 0.05, yPct = 0.04) {
  if (!trend || !trend.line || trend.line.length !== 2) return null;
  const [d0, d1] = xDomain[0] <= xDomain[1] ? xDomain : [xDomain[1], xDomain[0]];
  const spanX = d1 - d0 || 1;
  const x = d1 - spanX * xPct; // move left by xPct of domain width
  const [p0, p1] = trend.line;
  const m = (p1.y - p0.y) / ((p1.x - p0.x) || 1e-9);
  const b = p0.y - m * p0.x;
  const yBase = m * x + b;

  // shift label slightly upward (based on y-domain height)
  const [y0, y1] = yDomain || [0, 100];
  const spanY = y1 - y0 || 1;
  const y = yBase + spanY * yPct;

  return { x, y };
}

// --- Pick the best (x,y) for LEFT chart (Loyalty × WTP) ---
function bestAttitudesCombo({
  rows, groupBy, loyaltyVars, wtpVars, demoLookups, colorMode, modelColors, accent
}) {
  let best = { xVar: null, yVar: null, r2: -1 };
  for (const xVar of loyaltyVars) {
    for (const yVar of wtpVars) {
      const pts = buildAttitudesPointsOnePass(
        rows, groupBy, xVar, yVar, demoLookups, colorMode, modelColors, accent
      ).map(p => ({ x: p.x, y: p.y }));
      const reg = linearRegressionXY(pts);
      if (reg && Number.isFinite(reg.r2) && reg.r2 > best.r2) {
        best = { xVar, yVar, r2: reg.r2 };
      }
    }
  }
  return best.r2 >= 0 ? best : null;
}

// --- Pick the best (x,y) for RIGHT chart (PR_MOST × Imagery) ---
function bestImageryCombo({
  rows, groupBy, prMostOptions, imageryOptions, demoLookups, colorMode, modelColors, accent
}) {
  let best = { prLabel: null, imgKey: null, r2: -1 };

  for (const prLabel of prMostOptions) {
    for (const img of imageryOptions) {
      const byGroup = new Map();
      for (const r of rows) {
        const gk = groupBy === "cluster" ? r.cluster : String(r.model);
        if (!byGroup.has(gk)) byGroup.set(gk, []);
        byGroup.get(gk).push(r);
      }
      const pts = [];
      for (const [, gr] of byGroup.entries()) {
        const x = purchaseReasonPercent(gr, prLabel, demoLookups);
        const y = imageryPercent(gr, img.key);
        if (x != null && y != null && Number.isFinite(x) && Number.isFinite(y)) {
          pts.push({ x, y });
        }
      }
      const reg = linearRegressionXY(pts);
      if (reg && Number.isFinite(reg.r2) && reg.r2 > best.r2) {
        best = { prLabel, imgKey: img.key, r2: reg.r2 };
      }
    }
  }
  return best.r2 >= 0 ? best : null;
}

const BUCKET_MIN = 30000;
const BUCKET_STEP = 5000;
const OVER_MIN = 110000;
function fmtK(n) { return `$${Math.round(n / 1000)}k`; }
function fmtKDec(n) { return `$${(n / 1000).toFixed(1)}k`; }
function bucketLabel(low, high) {
  if (low === -Infinity) return "Under $30k";
  if (high === Infinity) return "$110k+";
  const displayHigh = high - 100;
  return `${fmtK(low)} to ${fmtKDec(displayHigh)}`;
}
function getFixedBucketRanges() {
  const ranges = [];
  ranges.push({ low: -Infinity, high: BUCKET_MIN, label: bucketLabel(-Infinity, BUCKET_MIN) });
  for (let low = BUCKET_MIN; low < OVER_MIN; low += BUCKET_STEP) {
    const high = low + BUCKET_STEP;
    ranges.push({ low, high, label: bucketLabel(low, high) });
  }
  ranges.push({ low: OVER_MIN, high: Infinity, label: bucketLabel(OVER_MIN, Infinity) });
  return ranges;
}
function buildBucketsForRows(rows) {
  const ranges = getFixedBucketRanges();
  const buckets = ranges.map((r) => ({ ...r, count: 0, pct: 0 }));
  const vals = [];
  for (const r of rows) {
    const n = coercePrice(r?.FIN_PRICE_UNEDITED);
    if (Number.isFinite(n)) vals.push(n);
  }
  const totalValid = vals.length;
  if (totalValid === 0) return { data: [], totalValid: 0 };
  for (const v of vals) {
    let idx = -1;
    if (v < BUCKET_MIN) idx = 0;
    else if (v >= OVER_MIN) idx = buckets.length - 1;
    else {
      const stepIdx = Math.floor((v - BUCKET_MIN) / BUCKET_STEP);
      idx = 1 + Math.max(0, Math.min(stepIdx, (OVER_MIN - BUCKET_MIN) / BUCKET_STEP - 1));
    }
    if (idx >= 0) buckets[idx].count += 1;
  }
  for (const b of buckets) b.pct = totalValid > 0 ? (b.count / totalValid) * 100 : 0;
  const data = buckets.map((b) => ({ label: b.label, pct: b.pct, count: b.count }));
  return { data, totalValid };
}

/* ---------- FAST price series ---------- */
function buildPriceSeriesByGroupFast(rows, groupingKey, groupOrder) {
  const ranges = getFixedBucketRanges();
  const nBuckets = ranges.length;
  const countsByGroup = new Map();
  const valTotals = new Map();

  for (const r of rows) {
    const key = groupingKey === "cluster" ? r.cluster : String(r.model);
    const price = coercePrice(r?.FIN_PRICE_UNEDITED);
    if (!Number.isFinite(price)) continue;
    let buckets = countsByGroup.get(key);
    if (!buckets) {
      buckets = new Uint32Array(nBuckets);
      countsByGroup.set(key, buckets);
      valTotals.set(key, 0);
    }
    let idx;
    if (price < BUCKET_MIN) idx = 0;
    else if (price >= OVER_MIN) idx = nBuckets - 1;
    else idx = 1 + Math.floor((price - BUCKET_MIN) / BUCKET_STEP);
    buckets[idx] += 1;
    valTotals.set(key, valTotals.get(key) + 1);
  }

  const keys = groupOrder ?? Array.from(countsByGroup.keys());
  return keys.map((k) => {
    const buckets = countsByGroup.get(k) ?? new Uint32Array(nBuckets);
    const total = valTotals.get(k) || 0;
    const data = ranges.map((range, i) => ({
      label: range.label,
      count: buckets[i],
      pct: total ? (buckets[i] / total) * 100 : 0,
    }));
    return { key: k, data };
  });
}

/* ---------- Attitudes helpers ---------- */
const AGREE_TOP3 = new Set(["strongly agree", "agree", "somewhat agree"]);
const AGREE_TOP2 = new Set(["strongly agree", "somewhat agree"]);
function getAttRaw(row, varName) {
  const v = row?.[varName];
  if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  const aliases = [`${varName}_LABEL`, `${varName}_TXT`, `${varName}_TEXT`, `${varName}_DESC`, `${varName}_LAB`];
  for (const a of aliases) {
    const va = row?.[a];
    if (va !== undefined && va !== null && String(va).trim() !== "") return va;
  }
  return null;
}
function normalizeLabel(s) { return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " "); }
function resolveMappedLabel(row, varName, demoLookups) {
  const raw = getAttRaw(row, varName);
  const codeMap = demoLookups.get(varName) || new Map();
  if (raw === null || raw === undefined) return null;
  if (codeMap.has(raw)) return codeMap.get(raw);
  const asStr = String(raw);
  if (codeMap.has(asStr)) return codeMap.get(asStr);
  const asNum = Number(asStr);
  if (Number.isFinite(asNum)) {
    if (codeMap.has(asNum)) return codeMap.get(asNum);
    if (codeMap.has(String(asNum))) return codeMap.get(String(asNum));
  }
  return asStr;
}
function agreePolicyFor(varName) {
  if (varName === "OL_MODEL_GRP") return "LOYAL_ONLY";
  if (/^STATE_/i.test(varName)) return "TOP2";
  return "TOP3";
}
function isTopNAgree(label, policy) {
  const s = normalizeLabel(label);
  if (policy === "LOYAL_ONLY") return s === "loyal";
  if (policy === "TOP2") return AGREE_TOP2.has(s);
  return AGREE_TOP3.has(s);
}

/* ---------- One-pass attitudes aggregation (left chart) ---------- */
function buildAttitudesPointsOnePass(
  rows, groupBy, attXVar, attYVar, demoLookups, colorMode, modelColors, accent
) {
  const acc = new Map();
  const polX = agreePolicyFor(attXVar);
  const polY = agreePolicyFor(attYVar);
  for (const r of rows) {
    const key = groupBy === "cluster" ? r.cluster : String(r.model);
    let a = acc.get(key);
    if (!a) {
      a = { n: 0, xAgree: 0, xValid: 0, xMiss: 0, yAgree: 0, yValid: 0, yMiss: 0 };
      acc.set(key, a);
    }
    a.n++;
    const lx = resolveMappedLabel(r, attXVar, demoLookups);
    if (lx == null || String(lx).trim() === "") a.xMiss++;
    else { a.xValid++; if (isTopNAgree(lx, polX)) a.xAgree++; }
    const ly = resolveMappedLabel(r, attYVar, demoLookups);
    if (ly == null || String(ly).trim() === "") a.yMiss++;
    else { a.yValid++; if (isTopNAgree(ly, polY)) a.yAgree++; }
  }
  const keys = Array.from(acc.keys()).sort(groupBy === "cluster" ? (a, b) => a - b : undefined);
  return keys.map((k) => {
    const a = acc.get(k);
    const xDen = a.xValid + a.xMiss; // include missing in denom (filtered population)
    const yDen = a.yValid + a.yMiss;
    return {
      key: k,
      name: groupBy === "cluster" ? `C${k}` : String(k),
      x: xDen ? (a.xAgree / xDen) * 100 : NaN,
      y: yDen ? (a.yAgree / yDen) * 100 : NaN,
      n: a.n,
      color: colorMode === "model" ? (modelColors[String(k)] || accent) : clusterColor(Number(k)),
    };
  });
}

/* ---------- NEW: % Agree for Imagery (Y) and % selecting PR_MOST (X) ---------- */
function imageryPercent(rows, imageryKey) {
  if (!rows || rows.length === 0) return null;
  let agree = 0;
  for (const r of rows) {
    const v = r?.[imageryKey];
    if (v === 1 || v === "1") agree += 1;
  }
  return (agree / rows.length) * 100;
}
function purchaseReasonPercent(rows, labelWanted, demoLookups) {
  if (!rows || rows.length === 0 || !labelWanted) return null;
  let sel = 0;
  for (const r of rows) {
    const lab = resolveMappedLabel(r, "PR_MOST", demoLookups);
    if (lab != null && String(lab).trim() !== "" && String(lab) === String(labelWanted)) sel += 1;
  }
  return (sel / rows.length) * 100;
}

/* ---------- Axis registries ---------- */
const AXIS_TYPES = [
  { id: "loyalty", label: "Loyalty" },
  { id: "wtp",     label: "Willingness to Pay" },
  { id: "pr",      label: "Purchase Reason" },
  { id: "img",     label: "Imagery" },
];
const axisTypeLabel = (id) => AXIS_TYPES.find(t => t.id === id)?.label || id;

function optionsForAxisType(type, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel }) {
  if (type === "loyalty") return LOYALTY_VARS.map(v => ({ value: v, label: varLabel(v) }));
  if (type === "wtp")     return WTP_VARS.map(v => ({ value: v, label: varLabel(v) }));
  if (type === "pr")      return prMostOptions.map(lab => ({ value: lab, label: lab }));
  if (type === "img")     return IMAGERY_OPTIONS.map(o => ({ value: o.key, label: o.label }));
  return [];
}

const axis = (id) => (AXIS_TYPES.find(t => t.id === id)?.name ?? AXIS_TYPES.find(t => t.id === id)?.label ?? id);

/* ---------- Percent calculators for each axis type ---------- */
function percentForAxis(rows, axis, demoLookups) {
  if (!rows || !rows.length || !axis) return NaN;

  if (axis.type === "loyalty" || axis.type === "wtp") {
    const varName = axis.key;
    const policy = agreePolicyFor(varName);
    let agree = 0, valid = 0, miss = 0;
    for (const r of rows) {
      const lab = resolveMappedLabel(r, varName, demoLookups);
      if (lab == null || String(lab).trim() === "") { miss++; continue; }
      valid++;
      if (isTopNAgree(lab, policy)) agree++;
    }
    const den = valid + miss;
    return den ? (agree / den) * 100 : NaN;
  }

  if (axis.type === "pr") {
    return purchaseReasonPercent(rows, axis.key, demoLookups) ?? NaN;
  }

  if (axis.type === "img") {
    return imageryPercent(rows, axis.key) ?? NaN;
  }

  return NaN;
}

/* ---------- Build points for any (xAxis, yAxis) pair ---------- */
function buildUnifiedPoints(rows, groupBy, xAxis, yAxis, demoLookups, colorMode, modelColors, accent) {
  const byGroup = new Map();
  for (const r of rows) {
    const gk = groupBy === "cluster" ? r.cluster : String(r.model);
    if (!byGroup.has(gk)) byGroup.set(gk, []);
    byGroup.get(gk).push(r);
  }

  const pts = [];
  for (const [gk, gr] of byGroup.entries()) {
    const x = percentForAxis(gr, xAxis, demoLookups);
    const y = percentForAxis(gr, yAxis, demoLookups);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const name = groupBy === "cluster" ? `C${gk}` : String(gk);
    const color = (colorMode === "cluster") ? clusterColor(Number(gk)) : (modelColors[String(gk)] || accent);
    pts.push({ key: gk, name, x, y, n: gr.length, color });
  }
  return pts;
}


function useAnimationToken(deps) { return React.useMemo(() => deps.join("::"), deps); }

const CG_SUV_COLOR = "#FF5432";
const CG_PU_COLOR = "#1F6FFF";
const SEG_MID_SUV_COLOR = "#F97316";
const SEG_LARGE_PU_COLOR = "#0EA5E9";

const chipFixedCG = (active, baseColor, panelColor, borderColor, textColor) => {
  const alpha = isDarkHex(panelColor) ? 0.22 : 0.14;
  return {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid ${active ? baseColor : borderColor}`,
    background: active ? `rgba(${hexToRgbStr(baseColor)}, ${alpha})` : "transparent",
    color: textColor,
    cursor: "pointer",
    fontSize: 14,
    transition: "border-color 120ms ease, background-color 120ms ease",
    minWidth: 90,
    textAlign: "center",
  };
};

export default function CustomerGroups({ COLORS: THEME, useStyles }) {
  const [datasetMode, setDatasetMode] = useState("CORE");
  const [guideOpen, setGuideOpen] = useState(false);
  const [group, setGroup] = useState("SUV");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSource, setDetailsSource] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]);
  const [colorMode, setColorMode] = useState("model");
  const [zoomCluster, setZoomCluster] = useState(null);
  const [centerT, setCenterT] = useState(0);
  const [selectedStateName, setSelectedStateName] = useState(null);
  const [showPersona, setShowPersona] = useState(false);
  const [selectedFieldGroup, setSelectedFieldGroup] = useState("Financing");
  const [demoModel, setDemoModel] = useState(null);
  const [attTrendOn, setAttTrendOn] = useState(false);  // Left scatter (Loyalty × WTP)
  const [immTrendOn, setImmTrendOn] = useState(false);  // Right scatter (PR_MOST × Imagery)
  const [bestLeftInfo, setBestLeftInfo] = useState(null);   // { xVar, yVar, r2 }
  const [bestRightInfo, setBestRightInfo] = useState(null); // { prLabel, imgKey, r2 }

  useEffect(() => {
    setZoomCluster(null);
    setCenterT(0);
    setSelectedStateName(null);
    setDemoModel(null);
    setGroup((prev) => {
      if (datasetMode === "CORE") {
        const next = prev === "SUV" || prev === "Pickup" ? prev : "SUV";
        return next === prev ? prev : next;
      } else {
        const next = prev === "MidSUV" || prev === "LargePickup" ? prev : "MidSUV";
        return next === prev ? prev : next;
      }
    });
  }, [datasetMode]);

  // Points source
  const dataPoints =
    datasetMode === "CORE"
      ? group === "SUV"
        ? suvPoints
        : group === "Pickup"
        ? puPoints
        : []
      : datasetMode === "SEGMENTS"
      ? group === "MidSUV"
        ? midSuvPoints
        : group === "LargePickup"
        ? largePuPoints
        : []
      : [];

  const rows = useMemo(() => {
    const out = [];
    for (const r of dataPoints || []) {
      const modelVal = r?.model ?? r?.BLD_DESC_RV_MODEL ?? r?.Model ?? r?.model_name ?? r?.MODEL ?? null;
      const x = Number(r?.emb_x);
      const y = Number(r?.emb_y);
      const cl = Number(r?.cluster);
      if (!modelVal || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(cl)) continue;
      out.push({ ...r, model: String(modelVal), raw_x: x, raw_y: y, emb_x: x, emb_y: y, cluster: cl });
    }
    return out;
  }, [dataPoints]);

  const allModels = useMemo(() => Array.from(new Set(rows.map((r) => r.model))).sort(), [rows]);

  const modelColors = useMemo(() => {
    const map = {};
    for (const m of allModels) {
      const idx = hashStr(m) % SERIES_COLORS.length;
      map[m] = SERIES_COLORS[idx];
    }
    return map;
  }, [allModels]);

  useEffect(() => setSelectedModels(allModels), [allModels]);
  useEffect(() => { setZoomCluster(null); setCenterT(0); }, [group]);

  const toggleModel = useCallback(
    (m) => setSelectedModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])),
    []
  );
  const selectAll = useCallback(() => setSelectedModels(allModels), [allModels]);
  const clearAll = useCallback(() => setSelectedModels([]), []);

  const demoLookups = useMemo(() => {
    const byField = new Map();
    for (const row of demosMapping || []) {
      const field = String(row?.NAME ?? "").trim();
      if (!field) continue;
      const start = row?.START;
      const label = String(row?.LABEL ?? "").trim();
      if (!byField.has(field)) byField.set(field, new Map());
      const m = byField.get(field);
      m.set(start, label);
      m.set(String(start), label);
      if (Number.isFinite(Number(start))) m.set(Number(start), label);
    }
    return byField;
  }, []);

  const VAR_LABELS = useMemo(() => {
    const map = new Map();
    for (const row of codeToTextMapRaw || []) {
      let code = "", text = "";
      if (Array.isArray(row)) {
        code = String(row[0] ?? "").trim();
        text = String(row[1] ?? "").trim();
      } else if (row && typeof row === "object") {
        code = String(row.code ?? row.CODE ?? row.key ?? row.Key ?? row.variable ?? row.VARIABLE ?? "").trim();
        text = String(row.text ?? row.label ?? row.LABEL ?? row.display ?? row.Display ?? "").trim();
      }
      if (code) map.set(code, text || code);
    }
    return map;
  }, [codeToTextMapRaw]);
  const varLabel = (code) => VAR_LABELS.get(String(code ?? "").trim()) || code;

  const getRowStateName = useMemo(() => {
    const codeMap = demoLookups.get("ADMARK_STATE") || new Map();
    return (row) => {
      for (const k of STATE_KEYS) {
        if (row && row[k] != null && String(row[k]).trim() !== "") {
          let raw = row[k];
          let val = String(raw).trim();
          if (k === "ADMARK_STATE") {
            const mapped = codeMap.get(raw) || codeMap.get(String(raw)) || codeMap.get(Number(raw));
            if (mapped) val = String(mapped).trim();
          }
          const name = toStateName(val) || US_STATE_ABBR_TO_NAME[String(val).toUpperCase()] || null;
          if (name) return name;
          const two = (val.match(/\b[A-Z]{2}\b/g) || []).find((tok) => US_STATE_ABBR_TO_NAME[tok.toUpperCase()]);
          if (two) return US_STATE_ABBR_TO_NAME[two.toUpperCase()];
        }
      }
      return null;
    };
  }, [demoLookups]);

  const stateNameCacheRef = useRef(new WeakMap());
  useEffect(() => { stateNameCacheRef.current = new WeakMap(); }, [getRowStateName]);
  const getRowStateNameCached = useCallback((row) => {
    const wm = stateNameCacheRef.current;
    if (wm.has(row)) return wm.get(row);
    const v = getRowStateName(row);
    wm.set(row, v);
    return v;
  }, [getRowStateName]);

  const baseByModel = useMemo(() => {
    const active = selectedModels?.length ? selectedModels : allModels;
    return rows.filter((r) => active.includes(r.model));
  }, [rows, selectedModels, allModels]);

  const plotFrame = useMemo(
    () => (zoomCluster == null ? baseByModel : baseByModel.filter((r) => r.cluster === zoomCluster)),
    [baseByModel, zoomCluster]
  );

  const scopeRows = useMemo(() => {
    const base = zoomCluster == null ? baseByModel : baseByModel.filter((r) => r.cluster === zoomCluster);
    if (!selectedStateName) return base;
    return base.filter((r) => getRowStateNameCached(r) === selectedStateName);
  }, [baseByModel, zoomCluster, selectedStateName, getRowStateNameCached]);

  const availableClusters = useMemo(
    () => Array.from(new Set(baseByModel.map((r) => r.cluster))).sort((a, b) => a - b),
    [baseByModel]
  );
  useEffect(() => { if (zoomCluster != null && !availableClusters.includes(zoomCluster)) setZoomCluster(null); },
    [availableClusters, zoomCluster]
  );

  const groupingKey = colorMode === "cluster" ? "cluster" : "model";
  const centroidsByGroup = useMemo(() => {
    const acc = new Map();
    for (const r of plotFrame) {
      const k = colorMode === "cluster" ? r.cluster : String(r.model);
      if (!acc.has(k)) acc.set(k, { sumX: 0, sumY: 0, n: 0 });
      const s = acc.get(k); s.sumX += r.emb_x; s.sumY += r.emb_y; s.n += 1;
    }
    const out = new Map();
    for (const [k, s] of acc.entries()) out.set(k, { cx: s.sumX / s.n, cy: s.sumY / s.n });
    return out;
  }, [plotFrame, colorMode]);

  const plotDataCentered = useMemo(() => {
    if (centerT <= 0) return plotFrame;
    return plotFrame.map((r) => {
      const key = colorMode === "cluster" ? r.cluster : String(r.model);
      const c = centroidsByGroup.get(key);
      return c ? { ...r, emb_x: lerp(r.raw_x, c.cx, centerT), emb_y: lerp(r.raw_y, c.cy, centerT) } : r;
    });
  }, [plotFrame, centroidsByGroup, centerT, colorMode]);
  
  // Stable row key (so sampling is deterministic across renders)
  const rowKey = useCallback(
    (r) => `${r.model}|${r.raw_x}|${r.raw_y}|${r.cluster}`,
    []
  );

  // Find the largest cluster in the current view (ties → lowest cluster id)
  const largestCluster = useMemo(() => {
    const counts = new Map();
    for (const r of plotFrame) {
      counts.set(r.cluster, (counts.get(r.cluster) || 0) + 1);
    }
    let best = null;
    let bestCount = -1;
    for (const [k, c] of counts.entries()) {
      if (c > bestCount || (c === bestCount && k < best)) {
        best = k;
        bestCount = c;
      }
    }
    return best;
  }, [plotFrame]);

  // Build a deterministic keep-set with ~50% of points in the largest cluster,
  // proportionally by model (exact per-model count via sorted hash)
  const retainedKeys = useMemo(() => {
    if (largestCluster == null) return null;

    // Group rows (from the *full* plotFrame) by model, but only for largest cluster
    const byModel = new Map();
    for (const r of plotFrame) {
      if (r.cluster !== largestCluster) continue;
      const arr = byModel.get(r.model) || [];
      arr.push(r);
      byModel.set(r.model, arr);
    }

    // Deterministic selection: sort by hash of rowKey, then take first 50%
    const keep = new Set();
    for (const [, arr] of byModel) {
      const sorted = [...arr].sort((a, b) => hashStr(rowKey(a)) - hashStr(rowKey(b)));
      const keepN = Math.ceil(sorted.length * 0.5); // half, rounded up
      for (let i = 0; i < keepN; i++) keep.add(rowKey(sorted[i]));
    }
    return keep;
  }, [plotFrame, largestCluster, rowKey]);

  // Final points used *only for rendering the scatter* (all analytics still use full data)
  const plotDataForRender = useMemo(() => {
    if (!retainedKeys || largestCluster == null) return plotDataCentered;
    // Filter the centered points, but keep full sets for non-largest clusters
    return plotDataCentered.filter(
      (r) => r.cluster !== largestCluster || retainedKeys.has(rowKey(r))
    );
  }, [plotDataCentered, largestCluster, retainedKeys, rowKey]);

  const groupKeys = useMemo(() => {
    const g = new Set(plotDataCentered.map((r) => r[groupingKey]));
    let arr = Array.from(g);
    if (colorMode === "cluster") arr = arr.filter((k) => Number.isFinite(k)).sort((a, b) => a - b);
    else arr = arr.map(String).sort();
    return arr;
  }, [plotDataCentered, groupingKey, colorMode]);

  const series = useMemo(() => {
    const buckets = new Map();
    for (const r of plotDataForRender) {
      const k = colorMode === "cluster" ? r.cluster : String(r.model);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    }
    return groupKeys.map((k) => ({ key: k, data: buckets.get(k) || [] }));
  }, [plotDataForRender, groupKeys, colorMode]);

  const modelsInScope = useMemo(() => {
    const set = new Set();
    for (const r of plotFrame) set.add(r.model);
    return Array.from(set).sort();
  }, [plotFrame]);

  // ---- Cluster-level snapshot (price, gender, age, occupation, location, income, education, hobbies)
  const clusterSnapshot = useMemo(() => {
    if (zoomCluster == null) return null;
    const subset = baseByModel.filter(r => r.cluster === zoomCluster);
    const total = subset.length;
    if (!total) return null;

    const labelOf = (row, field) => {
      const lab = resolveMappedLabel(row, field, demoLookups);
      const s = (lab ?? "").toString().trim();
      return s ? s : null;
    };

    const tally = (field) => {
      const m = new Map();
      for (const r of subset) {
        const k = labelOf(r, field);
        if (!k) continue;
        m.set(k, (m.get(k) || 0) + 1);
      }
      return m;
    };

    const topN = (m, n) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([label, count]) => ({ label, pct: Math.round((count * 100) / total) }));

    const incomeMap = (() => {
      const m1 = tally("DEMO_INCOME_BUCKET");
      if (m1.size) return m1;
      const m2 = tally("DEMO_INCOME");
      if (m2.size) return m2;
      return tally("DEMO_INCOME_LABEL");
    })();

    return {
      total,
      genderTop2: topN(tally("DEMO_GENDER1"), 2),
      ageTop1: topN(tally("BLD_AGE_GRP"), 1),
      occupTop3: topN(tally("DEMO_EMPLOY"), 3),
      locTop2: topN(tally("DEMO_LOCATION"), 2),
      incomeTop: topN(incomeMap, 3),
      eduTop2: topN(tally("DEMO_EDUCATION"), 2),
      hobbyTop3: topN(tally("BLD_HOBBY1_GRP"), 3),
    };
  }, [baseByModel, zoomCluster, demoLookups]);

  useEffect(() => { if (demoModel && !modelsInScope.includes(demoModel)) setDemoModel(null); }, [modelsInScope, demoModel]);

  // % of respondents by model within the zoomed cluster
  const clusterModelShare = useMemo(() => {
    if (zoomCluster == null) return { data: [], total: 0 };

    const base = demoModel ? scopeRows.filter(r => r.model === demoModel) : scopeRows;

    const rowsInCluster = base.filter(r => r.cluster === zoomCluster);
    const total = rowsInCluster.length || 0;
    if (!total) return { data: [], total: 0 };

    const counts = new Map();
    for (const r of rowsInCluster) {
      const m = String(r.model);
      counts.set(m, (counts.get(m) || 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const other = sorted.slice(8).reduce((s, [, c]) => s + c, 0);

    const data = top.map(([name, c]) => ({ name, count: c, value: (c / total) * 100 }));
    if (other > 0) data.push({ name: "Other", count: other, value: (other / total) * 100 });

    return { data, total };
  }, [scopeRows, demoModel, zoomCluster]);

  /* Left chart controls */
  const LOYALTY_VARS = FIELD_GROUPS.Loyalty;
  const WTP_VARS = FIELD_GROUPS["Willingness to Pay"];


  const [attXVar, setAttXVar] = useState(LOYALTY_VARS[0]);
  const [attYVar, setAttYVar] = useState(WTP_VARS[0]); // LEFT chart Y



  /* Right chart controls */
  const [imageryKey, setImageryKey] = useState(IMAGERY_OPTIONS[0].key);

  // Build the available PR_MOST options dynamically from the filtered-attitudes base
  const prMostOptions = useMemo(() => {
    const labels = new Set();
    for (const r of (zoomCluster == null ? baseByModel : baseByModel.filter(rr => rr.cluster === zoomCluster))) {
      const lab = resolveMappedLabel(r, "PR_MOST", demoLookups);
      if (lab != null && String(lab).trim() !== "") labels.add(String(lab));
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [baseByModel, zoomCluster, demoLookups]);

  const [prMostLabel, setPrMostLabel] = useState("");
  useEffect(() => {
    if (!prMostLabel || !prMostOptions.includes(prMostLabel)) {
      setPrMostLabel(prMostOptions[0] || "");
    }
  }, [prMostOptions, prMostLabel]);

  const labelForOption = useCallback(
  (type, key) => {
    const opts = optionsForAxisType(type, {
      LOYALTY_VARS,
      WTP_VARS,
      prMostOptions,
      IMAGERY_OPTIONS,
      varLabel,
    });
    return opts.find(o => o.value === key)?.label || String(key);
  },
  [LOYALTY_VARS, WTP_VARS, prMostOptions, varLabel]
);


  // Chart A (left) axis configs
  const [c1xType, setC1xType] = useState("loyalty");
  const [c1xKey,  setC1xKey]  = useState(LOYALTY_VARS[0]);
  const [c1yType, setC1yType] = useState("wtp");
  const [c1yKey,  setC1yKey]  = useState(WTP_VARS[0]);

  // Chart B (right) axis configs
  const [c2xType, setC2xType] = useState("pr");
  const [c2xKey,  setC2xKey]  = useState(""); // set when PR options are ready
  const [c2yType, setC2yType] = useState("img");
  const [c2yKey,  setC2yKey]  = useState(IMAGERY_OPTIONS[0].key);

  // Initialize c2xKey when PR options appear
  useEffect(() => {
    if (!c2xKey && prMostOptions.length) setC2xKey(prMostOptions[0]);
  }, [c2xKey, prMostOptions]);

  // Keep permanently locked, but retain the toggle code commented out in the UI
  const [attLocked, setAttLocked] = useState(true);
  const [priceLocked, setPriceLocked] = useState(true);
  const [mapLocked, setMapLocked] = useState(true);

  const animToken = useAnimationToken([
    datasetMode, group, colorMode, zoomCluster ?? "all",
    selectedModels.join("|"), selectedStateName ?? "no-state",
    demoModel ?? "all-models", attXVar, attYVar, imageryKey, prMostLabel,
    attLocked ? "attLOCK" : "attUNLOCK",
    priceLocked ? "priceLOCK" : "priceUNLOCK",
    mapLocked ? "mapLOCK" : "mapUNLOCK",
  ]);

  const attBaseRows = useMemo(() => {
    if (attLocked) return rows;
    return demoModel ? scopeRows.filter((r) => r.model === demoModel) : scopeRows;
  }, [attLocked, rows, scopeRows, demoModel]);

  /* ---- CHART A: points & domains from unified axes ---- */
  const chartA_X = useMemo(() => ({ type: c1xType, key: c1xKey }), [c1xType, c1xKey]);
  const chartA_Y = useMemo(() => ({ type: c1yType, key: c1yKey }), [c1yType, c1yKey]);

  const pointsA = useMemo(() => {
    const groupBy = colorMode === "cluster" ? "cluster" : "model";
    return buildUnifiedPoints(attBaseRows, groupBy, chartA_X, chartA_Y, demoLookups, colorMode, modelColors, THEME.accent);
  }, [attBaseRows, colorMode, chartA_X, chartA_Y, demoLookups, modelColors, THEME.accent]);

  const axDomainA = useMemo(() => percentPaddedDomain(pointsA.map(p => p.x)), [pointsA]);
  const ayDomainA = useMemo(() => percentPaddedDomain(pointsA.map(p => p.y)), [pointsA]);
  const trendA    = useMemo(() => attTrendOn ? buildTrend(pointsA, axDomainA) : null, [attTrendOn, pointsA, axDomainA]);
    /* ---- CHART B: points & domains from unified axes ---- */
  const chartB_X = useMemo(() => ({ type: c2xType, key: c2xKey }), [c2xType, c2xKey]);
  const chartB_Y = useMemo(() => ({ type: c2yType, key: c2yKey }), [c2yType, c2yKey]);

  const pointsB = useMemo(() => {
    const groupBy = colorMode === "cluster" ? "cluster" : "model";
    return buildUnifiedPoints(attBaseRows, groupBy, chartB_X, chartB_Y, demoLookups, colorMode, modelColors, THEME.accent);
  }, [attBaseRows, colorMode, chartB_X, chartB_Y, demoLookups, modelColors, THEME.accent]);

  const axDomainB = useMemo(() => percentPaddedDomain(pointsB.map(p => p.x)), [pointsB]);
  const ayDomainB = useMemo(() => percentPaddedDomain(pointsB.map(p => p.y)), [pointsB]);
  const trendB    = useMemo(() => immTrendOn ? buildTrend(pointsB, axDomainB) : null, [immTrendOn, pointsB, axDomainB]);
    const suggestBestCombos = useCallback(() => {
    const groupBy = (colorMode === "cluster") ? "cluster" : "model";

    // Group once so all pairs reuse the same buckets
    const groups = new Map(); // gKey -> row[]
    for (const r of attBaseRows) {
      const gk = (groupBy === "cluster") ? r.cluster : String(r.model);
      if (!groups.has(gk)) groups.set(gk, []);
      groups.get(gk).push(r);
    }
    const groupKeys = Array.from(groups.keys());

    // Axis families -> candidate keys
    const typeToKeys = {
      loyalty: Array.isArray(LOYALTY_VARS) ? LOYALTY_VARS : [],
      wtp:     Array.isArray(WTP_VARS)     ? WTP_VARS     : [],
      pr:      Array.isArray(prMostOptions)? prMostOptions: [],
      img:     Array.isArray(IMAGERY_OPTIONS) ? IMAGERY_OPTIONS.map(o => o.key) : [],
    };
    const families = Object.keys(typeToKeys).filter(t => typeToKeys[t].length > 0);

    // Cache percentages per (family,key,group)
    const pctCache = new Map(); // `${type}|${key}|${gk}` -> number
    const getPct = (type, key, gk) => {
      const cacheKey = `${type}|${key}|${gk}`;
      if (pctCache.has(cacheKey)) return pctCache.get(cacheKey);
      const rows = groups.get(gk) || [];
      let pct = NaN;

      if (type === "loyalty" || type === "wtp") {
        const varName = key;
        const policy = agreePolicyFor(varName);
        let agree = 0, denom = 0;
        for (const row of rows) {
          const lab = resolveMappedLabel(row, varName, demoLookups);
          // include missing in denominator to match your other panels
          denom += 1;
          if (lab != null && String(lab).trim() !== "" && isTopNAgree(lab, policy)) agree += 1;
        }
        pct = denom ? (100 * agree) / denom : NaN;
      } else if (type === "pr") {
        let count = 0;
        const denom = rows.length;
        for (const row of rows) {
          const lab = resolveMappedLabel(row, "PR_MOST", demoLookups);
          if (lab != null && String(lab).trim() === String(key)) count += 1;
        }
        pct = denom ? (100 * count) / denom : NaN;
      } else if (type === "img") {
        let count = 0;
        const denom = rows.length;
        for (const row of rows) {
          const v = row?.[key];
          if (v === 1 || v === "1") count += 1;
        }
        pct = denom ? (100 * count) / denom : NaN;
      }

      pctCache.set(cacheKey, pct);
      return pct;
    };

    // Build all cross-family pairs (no same-family), compute R² for each key pair
    const candidates = [];
    for (let i = 0; i < families.length; i++) {
      for (let j = i + 1; j < families.length; j++) {
        const tX = families[i];
        const tY = families[j];
        for (const kx of typeToKeys[tX]) {
          for (const ky of typeToKeys[tY]) {
            const pts = [];
            for (const g of groupKeys) {
              const x = getPct(tX, kx, g);
              const y = getPct(tY, ky, g);
              if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
            }
            if (pts.length >= 2) {
              const reg = linearRegressionXY(pts);
              if (reg && Number.isFinite(reg.r2)) {
                candidates.push({ xType: tX, xKey: kx, yType: tY, yKey: ky, r2: reg.r2 });
              }
            }
          }
        }
      }
    }

    // Sort by R² desc
    candidates.sort((a, b) => b.r2 - a.r2);

    const best = candidates[0] || null;
    const second = candidates.find(c =>
      c && (
        c.xType !== best?.xType || c.xKey !== best?.xKey ||
        c.yType !== best?.yType || c.yKey !== best?.yKey
      )
    ) || null;

    if (best) {
      setC1xType(best.xType); setC1xKey(best.xKey);
      setC1yType(best.yType); setC1yKey(best.yKey);
      setAttTrendOn(true);
      setBestLeftInfo(best);
    } else {
      setBestLeftInfo(null);
    }

    if (second) {
      setC2xType(second.xType); setC2xKey(second.xKey);
      setC2yType(second.yType); setC2yKey(second.yKey);
      setImmTrendOn(true);
      setBestRightInfo(second);
    } else {
      setBestRightInfo(null);
    }
  }, [
    attBaseRows,
    colorMode,
    demoLookups,
    LOYALTY_VARS,
    WTP_VARS,
    prMostOptions,
    IMAGERY_OPTIONS,
    setC1xType, setC1xKey, setC1yType, setC1yKey,
    setC2xType, setC2xKey, setC2yType, setC2yKey,
    setBestLeftInfo, setBestRightInfo,
    setAttTrendOn, setImmTrendOn,
  ]);



  /* ---- Clusters domains animation ---- */
  const targetX = useMemo(() => paddedDomain(plotFrame.map((r) => r.emb_x)), [plotFrame]);
  const targetY = useMemo(() => paddedDomain(plotFrame.map((r) => r.emb_y)), [plotFrame]);
  const [animX, setAnimX] = useState(targetX);
  const [animY, setAnimY] = useState(targetY);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const fromXRef = useRef(targetX);
  const fromYRef = useRef(targetY);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = 400;
    startRef.current = performance.now();
    fromXRef.current = animX || targetX;
    fromYRef.current = animY || targetY;
    const step = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      setAnimX(tweenDomain(fromXRef.current, targetX, t));
      setAnimY(tweenDomain(fromYRef.current, targetY, t));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetX[0], targetX[1], targetY[0], targetY[1]]);

  /* ---- Map prep ---- */
  const demoBaseRows = useMemo(() => (zoomCluster == null ? baseByModel : baseByModel.filter((r) => r.cluster === zoomCluster)), [baseByModel, zoomCluster]);
  const mapBaseRows = useMemo(() => (demoModel ? demoBaseRows.filter((r) => r.model === demoModel) : demoBaseRows), [demoBaseRows, demoModel]);
  const mapSourceRows = useMemo(() => (mapLocked ? rows : mapBaseRows), [mapLocked, rows, mapBaseRows]);

  const stateAgg = useMemo(() => {
    const counts = new Map(); let total = 0;
    for (const r of mapSourceRows) {
      const name = getRowStateNameCached(r);
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
      total += 1;
    }
    const pcts = new Map(); let maxPct = 0;
    if (total > 0) {
      for (const [name, c] of counts.entries()) {
        const pct = (c / total) * 100;
        pcts.set(name, pct);
        if (pct > maxPct) maxPct = pct;
      }
    }
    return { counts, pcts, total, maxPct };
  }, [mapSourceRows, getRowStateNameCached]);

  const [hoverState, setHoverState] = useState(null);

  /* ---- Demographics panel ---- */
  const demoSummary = useMemo(() => {
    const sections = [];
    const fields = FIELD_GROUPS[selectedFieldGroup] || [];
    const srcAll = demoModel ? scopeRows.filter((r) => r.model === demoModel) : scopeRows;
    const categoricalFinFields = new Set(["C1_PL", "FIN_CREDIT"]);

    for (const field of fields) {
      const codeMap = demoLookups.get(field) || new Map();
      const isFinancingNumeric = selectedFieldGroup === "Financing" && !categoricalFinFields.has(field);

      if (isFinancingNumeric) {
        let sum = 0, wsum = 0, nValid = 0, nMissing = 0;
        for (const r of srcAll) {
          const rawVal = r?.[field];
          const num = coerceNumber(rawVal);
          if (Number.isFinite(num)) { sum += num; wsum += 1; nValid++; } else { nMissing++; }
        }
        if (nValid > 0) {
          const avg = wsum > 0 ? sum / wsum : NaN;
          sections.push({ field, mode: "numeric", kpi: { label: "Average", value: avg, display: formatFinValue(field, avg), nValid, nMissing } });
          continue;
        }
      }

      const counts = new Map(); let validCount = 0; let missingCount = 0;
      for (const r of srcAll) {
        const rawVal = r?.[field];
        if (rawVal === undefined || rawVal === null || String(rawVal).trim() === "") { missingCount++; continue; }
        let label = String(rawVal).trim();
        if (codeMap.has(rawVal)) label = codeMap.get(rawVal);
        else if (codeMap.has(String(rawVal))) label = codeMap.get(String(rawVal));
        else if (codeMap.has(Number(rawVal))) label = codeMap.get(Number(rawVal));
        else {
          const asNum = Number(label);
          if (Number.isFinite(asNum) && codeMap.has(asNum)) label = codeMap.get(asNum);
          else if (codeMap.has(String(asNum))) label = codeMap.get(String(asNum));
        }
        counts.set(label, (counts.get(label) || 0) + 1);
        validCount++;
      }
      if (validCount + missingCount === 0) continue;

      const fieldTotal = validCount + missingCount;
      const items = Array.from(counts.entries())
        .map(([label, count]) => ({ label, count, pct: (count / fieldTotal) * 100 }))
        .sort((a, b) => b.count - a.count);

      if (missingCount > 0) items.push({ label: "Unknown", count: missingCount, pct: (missingCount / fieldTotal) * 100 });

      const sumPct = items.reduce((a, b) => a + b.pct, 0);
      if (Math.abs(sumPct - 100) > 0.1 && items.length > 0) {
        const diff = 100 - sumPct;
        items[items.length - 1].pct += diff;
      }

      if (field === "DEMO_EMPLOY") {
        const unknown = items.find((d) => d.label === "Unknown");
        const top10 = items.filter((d) => d.label !== "Unknown").sort((a, b) => b.count - a.count).slice(0, 10);
        const finalItems = unknown ? [...top10, unknown] : top10;
        sections.push({ field, mode: "categorical", items: finalItems, total: fieldTotal });
        continue;
      }

      const order = VALUE_ORDER[field];
      if (order) {
        const idx = (label) => { const i = order.indexOf(label); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
        items.sort((a, b) => { const ai = idx(a.label), bi = idx(b.label); if (ai !== bi) return ai - bi; return b.pct - a.pct; });
      }

      sections.push({ field, mode: "categorical", items, total: fieldTotal });
    }

    if (selectedFieldGroup === "Demographics") {
      const order = FIELD_GROUPS.Demographics;
      const idx = (f) => { const i = order.indexOf(f); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
      sections.sort((a, b) => idx(a.field) - idx(b.field));
    } else {
      sections.sort((a, b) => {
        if (a.mode !== b.mode) return a.mode === "numeric" ? -1 : 1;
        return (b.items?.[0]?.pct || 0) - (a.items?.[0]?.pct || 0);
      });
    }

    return sections;
  }, [scopeRows, demoModel, demoLookups, selectedFieldGroup]);

  const activeSampleSize = plotFrame.length;

  /* ---- Price prep ---- */
  const priceBaseRows = useMemo(() => {
    if (priceLocked) return rows;
    return demoModel ? scopeRows.filter((r) => r.model === demoModel) : scopeRows;
  }, [priceLocked, rows, scopeRows, demoModel]);

  const priceGroupKeys = useMemo(() => {
    const set = new Set(priceBaseRows.map((r) => (colorMode === "cluster" ? r.cluster : String(r.model))));
    let arr = Array.from(set);
    if (colorMode === "cluster") arr = arr.filter(Number.isFinite).sort((a, b) => a - b);
    else arr = arr.sort();
    return arr;
  }, [priceBaseRows, colorMode]);

  const activePriceSampleSize = priceBaseRows.length;

  const groupTitle =
    datasetMode === "CORE"
      ? group === "Pickup"
        ? "Core Pickup Clusters"
        : "Core SUV Clusters"
      : group === "LargePickup"
      ? "Segments — Large Pickups"
      : "Segments — Mid SUVs";

  /* Precompute cluster centroids for overlay */
  const clusterCentroids = useMemo(() => {
    const byCluster = new Map();
    for (const r of baseByModel) {
      const s = byCluster.get(r.cluster) || { sx: 0, sy: 0, n: 0 };
      s.sx += r.emb_x; s.sy += r.emb_y; s.n++;
      byCluster.set(r.cluster, s);
    }
    return Array.from(byCluster.entries()).map(([cluster, s]) => ({
      cluster, emb_x: s.sx / s.n, emb_y: s.sy / s.n,
    }));
  }, [baseByModel]);

  return (
    <div style={{ minHeight: "100vh", padding: 16, fontFamily: "var(--app-font)", background: THEME.bg, color: THEME.text }}>
      {/* ---- Header & Overview ---- */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: THEME.accent, fontSize: 38, fontWeight: 700, marginBottom: 10 }}>Customer Groups</h1>
        <div style={{ position: "relative" }}>
          <p style={{ color: THEME.muted, margin: 0, fontSize: 20, lineHeight: 1.4, paddingRight: 36 }}>
            Explore how customer segments differ across models and clusters. Toggle datasets, select models, or filter by state to see how
            attitudes, transaction prices, and demographics vary within your audience.
          </p>
          <button
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
            aria-label={guideOpen ? "Collapse overview" : "Expand overview"}
            style={{
              position: "absolute", right: 0, top: 0, height: 28, width: 28, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text, cursor: "pointer",
              boxShadow: THEME.name === "midnight" ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.10)",
            }}
            title={guideOpen ? "Hide overview" : "Show overview"}
          >
            {guideOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
          </button>
        </div>

        <div
          style={{
            overflow: "hidden",
            transition: "max-height 280ms ease, opacity 220ms ease, margin-top 200ms ease",
            maxHeight: guideOpen ? 1400 : 0, opacity: guideOpen ? 1 : 0, marginTop: guideOpen ? 12 : 0,
          }}
        >
          <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 16, color: THEME.text }}>
            <div style={{ color: THEME.text, fontSize: 18, marginBottom: 20 }}>
              This tool helps you understand <b>who Scout's customers are</b>, how these customers are <b>grouped</b>, what makes them <b>similar</b>, and what makes them <b>different</b>.
              <br /><br />
              It brings together four views— <i>high-level clusters</i>, <i>attitudes on loyalty and willingness to pay</i>, <i>location of residence</i>, and <i>transaction price</i> — plus
              a detailed multi-group panel to explore <b>demographics</b>, <b>financing</b>, and <b>buying behavior</b>. You can explore all of this with our core SUV and Pickup competitive set,
              as well as our broader addressable market segments.
            </div>
          </div>
        </div>
      </div>

      {/* ---- Controls row ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          alignItems: "start",
          marginBottom: 12,
        }}
      >
        {/* Category + Body/Segment */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: THEME.muted, marginTop: 20, marginBottom: 2, fontSize: 16 }}>Choose category</div>
          {(() => {
            const isDark = isDarkHex(THEME.panel);
            const TOGGLE_ACTIVE_BORDER = isDark ? "#FFFFFF" : "#11232F";
            const TOGGLE_ACTIVE_BG = isDark ? "rgba(255,255,255,0.22)" : "rgba(17,35,47,0.10)";
            const TOGGLE_IDLE_BORDER = THEME.border;
            const TOGGLE_TEXT = THEME.text;
            const options = [{ id: "CORE", label: "Core Set" }, { id: "SEGMENTS", label: "Segments" }];
            return (
              <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 12 }}>
                {options.map((opt) => {
                  const active = datasetMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setDatasetMode(opt.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: active ? `1px solid ${TOGGLE_ACTIVE_BORDER}` : `1px solid ${TOGGLE_IDLE_BORDER}`,
                        background: active ? TOGGLE_ACTIVE_BG : "transparent",
                        fontSize: 16,
                        color: TOGGLE_TEXT,
                        cursor: "pointer",
                        transition: "background-color 120ms ease, border-color 120ms ease",
                      }}
                      title={opt.label}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {datasetMode === "CORE" ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: THEME.muted, marginTop: 8, marginBottom: 12 }}>Choose body style</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, max-content)", gap: 8, justifyContent: "start" }}>
                <button onClick={() => setGroup("SUV")} style={chipFixedCG(group === "SUV", CG_SUV_COLOR, THEME.panel, THEME.border, THEME.text)}>SUV</button>
                <button onClick={() => setGroup("Pickup")} style={chipFixedCG(group === "Pickup", CG_PU_COLOR, THEME.panel, THEME.border, THEME.text)}>Pickup</button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: THEME.muted, marginTop: 8, marginBottom: 12 }}>Choose segment</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, max-content)", gap: 8, justifyContent: "start" }}>
                <button onClick={() => setGroup("MidSUV")} style={chipFixedCG(group === "MidSUV", SEG_MID_SUV_COLOR, THEME.panel, THEME.border, THEME.text)}>Mid SUVs</button>
                <button onClick={() => setGroup("LargePickup")} style={chipFixedCG(group === "LargePickup", SEG_LARGE_PU_COLOR, THEME.panel, THEME.border, THEME.text)}>Large Pickups</button>
              </div>
            </div>
          )}
        </div>

        {/* Models */}
        <div>
          <div style={{ color: THEME.muted, marginTop: 10, marginBottom: 12 }}>Choose models</div>
          {datasetMode === "SEGMENTS" && group === "MidSUV" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 8, alignItems: "stretch", marginBottom: 10 }}>
              {allModels.map((m) => {
                const active = selectedModels.includes(m);
                const baseColor = modelColors[m] || THEME.accent;
                return (
                  <button
                    key={m}
                    onClick={() => toggleModel(m)}
                    title={m}
                    style={{
                      width: "100%",
                      textAlign: "center",
                      background: active ? `rgba(${hexToRgbStr(baseColor)}, ${isDarkHex(THEME.panel) ? 0.22 : 0.14})` : "transparent",
                      color: THEME.text,
                      border: `1px solid ${active ? baseColor : THEME.border}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 13,
                      transition: "border-color 120ms ease, background-color 120ms ease, color 120ms ease",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "nowrap", gap: 8, overflowX: "auto", whiteSpace: "nowrap", paddingBottom: 10 }}>
              {allModels.map((m) => {
                const active = selectedModels.includes(m);
                const baseColor = modelColors[m] || THEME.accent;
                return (
                  <button key={m} onClick={() => toggleModel(m)} style={chipFixedCG(active, baseColor, THEME.panel, THEME.border, THEME.text)} title={m}>
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 8, marginBottom: 20, display: "flex", gap: 8 }}>
            <button onClick={selectAll} style={{ background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
              Select all
            </button>
            <button onClick={clearAll} style={{ background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
              Clear
            </button>
          </div>
        </div>

        {/* Color-by, cluster zoom, collapse slider */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 40, marginTop: 8, marginBottom: 0 }}>
          {/* Color by */}
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              border: `1px solid ${THEME.border}`,
              overflow: "hidden",
              boxShadow: THEME.name === "midnight" ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.15)",
              background: THEME.name === "midnight" ? THEME.panel : "rgba(0,0,0,0.04)",
            }}
          >
            {["cluster", "model"].map((mode) => {
              const active = colorMode === mode;
              const activeBg = THEME.name === "midnight" ? "#ffffff" : "#f9f9f9";
              const inactiveBg = THEME.name === "midnight" ? THEME.panel : "rgba(0,0,0,0.04)";
              const activeText = "#111827";
              const inactiveText = THEME.name === "midnight" ? THEME.text : "#444";
              return (
                <button
                  key={mode}
                  onClick={() => setColorMode(mode)}
                  style={{
                    background: active ? activeBg : inactiveBg,
                    color: active ? activeText : inactiveText,
                    border: "none",
                    padding: "6px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    opacity: active ? 1 : 0.75,
                    boxShadow: active
                      ? THEME.name === "midnight"
                        ? "inset 0 0 0 1px rgba(255,255,255,0.6)"
                        : "inset 0 0 0 1px rgba(0,0,0,0.05)"
                      : "none",
                  }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Cluster zoom (dynamic) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
            <button
              onClick={() => setZoomCluster(null)}
              style={{
                background: zoomCluster == null ? "#ffffff" : THEME.panel,
                color: zoomCluster == null ? "#111827" : THEME.text,
                border: `1px solid ${THEME.border}`,
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                opacity: zoomCluster == null ? 1 : 0.7,
                transition: "all 0.2s ease",
                boxShadow: zoomCluster == null ? "0 1px 2px rgba(0,0,0,0.08)" : "inset 0 0 0 1px rgba(255,255,255,0.05)",
                whiteSpace: "nowrap",
              }}
              title="Show all clusters"
            >
              All
            </button>
            {availableClusters.map((k) => {
              const color = FIXED_CLUSTER_COLORS[k] || THEME.accent;
              const active = zoomCluster === k;
              return (
                <button
                  key={`cluster-${k}`}
                  onClick={() => setZoomCluster(k)}
                  title={`Zoom to C${k}`}
                  style={{
                    background: color,
                    color: "#ffffff",
                    border: `1px solid ${color}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: active ? 1 : 0.45,
                    filter: active ? "none" : "grayscale(0.2)",
                    transition: "opacity 0.2s ease, filter 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {`C${k}`}
                </button>
              );
            })}
          </div>

          {/* Collapse slider */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ color: THEME.muted }}>Collapse points:</div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={centerT}
              onChange={(e) => setCenterT(parseFloat(e.target.value))}
              style={{ width: 200 }}
            />
            <div style={{ width: 10, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {(centerT * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* ---- Top row: Scatter + Demographics ---- */}
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flex: 1, height: LAYOUT.topRowHeight }}>
        {/* Scatter / Clusters */}
        <div
          style={{
            flex: 1, background: THEME.panel, border: `1px solid ${THEME.border}`,
            borderRadius: 12, height: "100%", boxSizing: "border-box", position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 20, left: 0, width: "100%", textAlign: "center", fontWeight: 700, fontSize: 24, color: THEME.text, pointerEvents: "none" }}>
            {groupTitle}
          </div>
          <div style={{ position: "absolute", top: 45, right: 30, fontSize: 13, fontWeight: 500, color: THEME.muted, pointerEvents: "none" }}>
            Sample size: <span style={{ color: THEME.text, fontWeight: 600 }}>{activeSampleSize.toLocaleString()}</span>
          </div>

          {/* Details (clusters) */}
          <button
            onClick={() => { setDetailsSource("clusters"); setDetailsOpen(true); }}
            style={{
              position: "absolute", top: 10, left: 10, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
            title="Open detailed view"
          >
            Details
          </button>

          {zoomCluster != null && (
            <button
              onClick={() => setShowPersona(true)}
              style={{
                position: "absolute", top: 10, right: 26, zIndex: 2,
                background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
                borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
              title="Open persona details"
            >
              Show Persona
            </button>
          )}

          <div style={{ position: "absolute", top: 55, left: -35, right: 24, bottom: -10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 14, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={THEME.border} strokeDasharray="4 6" />
                <XAxis type="number" dataKey="emb_x" domain={animX} tickFormatter={() => ""} tickLine={false} axisLine={false} tickMargin={0} />
                <YAxis type="number" dataKey="emb_y" domain={animY} tickFormatter={() => ""} tickLine={false} axisLine={false} tickMargin={0} />
                {series.map((s) => {
                  const k = s.key;
                  const data = s.data;
                  const fillColor = colorMode === "model" ? (modelColors[String(k)] || THEME.accent) : clusterColor(k, groupKeys);
                  return (
                    <Scatter
                      key={String(k)}
                      name={colorMode === "cluster" ? `C${k}` : String(k)}
                      data={data}
                      fill={fillColor}
                      isAnimationActive={false}
                      onClick={(pt) => {
                        const clusterVal = pt?.payload?.cluster;
                        if (Number.isFinite(clusterVal)) setZoomCluster(clusterVal);
                      }}
                      shape={<TinyDot />}
                    />
                  );
                })}

                {zoomCluster == null && (
                  <Scatter
                    data={clusterCentroids}
                    name=""
                    legendType="none"
                    isAnimationActive={false}
                    shape={(props) => (
                      <CentroidDot
                        {...props}
                        THEME={THEME}
                        onClick={(p) => {
                          if (Number.isFinite(p?.cluster)) setZoomCluster(p.cluster);
                        }}
                      />
                    )}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Sidebar */}
        <div
          style={{
            width: 360, height: "100%", background: THEME.panel, border: `1px solid ${THEME.border}`,
            borderRadius: 12, padding: 12, color: THEME.text, display: "flex", flexDirection: "column", boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
            <select
              value={selectedFieldGroup}
              onChange={(e) => setSelectedFieldGroup(e.target.value)}
              style={{
                background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
                padding: "6px 10px", borderRadius: 8, fontWeight: 700,
              }}
              title="Choose category"
            >
              {["Financing", "Demographics", "Buying Behavior", "Loyalty", "Willingness to Pay"].map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}

            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              onClick={() => setDemoModel(null)}
              style={{
                background: demoModel == null ? THEME.accent : THEME.panel,
                color: demoModel == null ? THEME.onAccent : THEME.muted,
                border: `1px solid ${demoModel == null ? THEME.accent : THEME.border}`,
                borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12,
              }}
            >
              All
            </button>
            {modelsInScope.map((m) => {
              const active = demoModel === m;
              return (
                <button
                  key={`demoModel-${m}`}
                  onClick={() => setDemoModel(m)}
                  style={{
                    background: active ? THEME.accent : THEME.panel,
                    color: active ? THEME.onAccent : THEME.muted,
                    border: `1px solid ${active ? THEME.accent : THEME.border}`,
                    borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12,
                  }}
                  title={m}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div style={{ overflowY: "auto", paddingRight: 4, gap: 12, display: "flex", flexDirection: "column" }}>
            {selectedStateName && scopeRows.length === 0 ? (
              <div style={{ fontStyle: "italic", opacity: 0.85, padding: "8px 4px" }}>
                No records for <b>{selectedStateName}</b> in current scope (check ADMARK_STATE coding).
              </div>
            ) : demoSummary.length === 0 ? (
              <div style={{ fontStyle: "italic", opacity: 0.8, padding: "8px 4px" }}>No fields observed in current scope.</div>
            ) : (
              demoSummary.map((section) => (
                <div key={section.field} style={{ background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: THEME.text }}>{varLabel(section.field)}</div>
                  {section.mode === "numeric" ? (
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "2px 0" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent }}>{section.kpi.display}</div>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ opacity: 0.7 }}>Sample size:</span>{" "}
                        <span style={{ fontWeight: 700, color: THEME.text }}>{section.kpi.nValid.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    section.items.map((it) => (
                      <div key={`${section.field}::${it.label}`} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontSize: 12, color: THEME.muted }}>{it.label}</div>
                          <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: THEME.text }}>
                            {it.pct.toFixed(1)}% <span style={{ opacity: 0.6 }}>({it.count.toLocaleString()})</span>
                          </div>
                        </div>
                        <div
                          style={{
                            height: 6, background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 999, overflow: "hidden", marginTop: 4,
                          }}
                        >
                          <div style={{ width: `${Math.min(100, it.pct).toFixed(2)}%`, height: "100%", background: THEME.accent }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---- Best-combo helper bar (for both second-row charts) ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
        <button
          onClick={suggestBestCombos}
          title="Find x–y pairs with the highest R² for both charts and switch to them"
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${THEME.accent}`,
            background: `rgba(${hexToRgbStr(THEME.accent)}, ${isDarkHex(THEME.panel) ? 0.22 : 0.14})`,
            color: THEME.text,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          Best x–y combos (R²)
        </button>

        {bestLeftInfo && (
          <div style={{ fontSize: 12, color: THEME.muted }}>
            Left&nbsp;{axisTypeLabel(bestLeftInfo.xType)}×{axisTypeLabel(bestLeftInfo.yType)}:&nbsp;
            <b style={{ color: THEME.text }}>
              {labelForOption(bestLeftInfo.xType, bestLeftInfo.xKey)} × {labelForOption(bestLeftInfo.yType, bestLeftInfo.yKey)}
            </b>
            &nbsp;• R²={bestLeftInfo.r2.toFixed(2)}
          </div>
        )}
        {bestRightInfo && (
          <div style={{ fontSize: 12, color: THEME.muted }}>
            2nd&nbsp;{axisTypeLabel(bestRightInfo.xType)}×{axisTypeLabel(bestRightInfo.yType)}:&nbsp;
            <b style={{ color: THEME.text }}>
              {labelForOption(bestRightInfo.xType, bestRightInfo.xKey)} × {labelForOption(bestRightInfo.yType, bestRightInfo.yKey)}
            </b>
            &nbsp;• R²={bestRightInfo.r2.toFixed(2)}
          </div>
        )}

      </div>

      
      {/* ---- Middle row: Attitudes duplicated 50/50 ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "stretch", gridAutoRows: "minmax(0, auto)" }}>
        {/* LEFT attitudes (Loyalty × WTP) */}
        <div
          style={{
            position: "relative", background: THEME.panel, border: `1px solid ${THEME.border}`,
            borderRadius: 12, padding: 12, minHeight: "400px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <button
            onClick={() => { setDetailsSource("attitudes"); setDetailsOpen(true); }}
            title="Open detailed view"
            style={{
              position: "absolute", top: 10, left: 10, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            Details
          </button>
          {/* Lock toggle — hidden but kept for future use
          <button
            onClick={() => setAttLocked((v) => !v)}
            title={attLocked ? "Unlock — follow filters" : "Lock — show full population"}
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: "none", borderRadius: 8, padding: 6, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s ease",
            }}
          >
            {attLocked ? <Lock size={16} strokeWidth={2} /> : <Unlock size={16} strokeWidth={2} />}
          </button>
          */}
          {/* Trendline toggle */}
          <button
            onClick={() => setAttTrendOn(v => !v)}
            title={attTrendOn ? "Hide regression line" : "Show regression line"}
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: 6, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s ease",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              opacity: attTrendOn ? 1 : 0.8,
            }}
          >
            <TrendingUp size={16} strokeWidth={2} />
          </button>

          <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 700, fontSize: 22, marginTop: 8, marginBottom: 0, color: THEME.AGREE_TOP2text }}>
            {axis(c1xType)} &nbsp;×&nbsp; {axis(c1yType)}
          </div>


          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {/* top label (dynamic axis names) */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                width: "70%",
                transform: "translateX(-50%)",
                fontStyle: "italic",
                fontWeight: 600,
                color: THEME.muted,
                fontSize: 10,
                textAlign: "center",
              }}
            >
              {optionsForAxisType(c1xType, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel })
                .find(o => o.value === c1xKey)?.label || ""}
              <span style={{ fontStyle: "normal", fontWeight: 400, margin: "0 6px" }}>×</span>
              {optionsForAxisType(c1yType, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel })
                .find(o => o.value === c1yKey)?.label || ""}
            </div>
            {attTrendOn && trendA && (
              <div style={{ position: "absolute", top: 8, right: 30, fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                R²: <span style={{ color: THEME.text }}>{trendA.r2.toFixed(2)}</span>
              </div>
            )}


            <div style={{ position: "absolute", top: 25, right: 30, fontSize: 13, color: THEME.muted, textAlign: "right" }}>
              Sample size: <span style={{ fontWeight: 700, color: THEME.text }}>{attBaseRows.length.toLocaleString()}</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 50, right: 20, bottom: 25, left: 5 }}>
                <CartesianGrid stroke={THEME.border} strokeDasharray="4 6" />
                <XAxis
                  type="number"
                  dataKey="x"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fill: THEME.muted, fontSize: 12 }}
                  stroke={THEME.border}
                  domain={axDomainA}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fill: THEME.muted, fontSize: 12 }}
                  stroke={THEME.border}
                  domain={ayDomainA}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: THEME.border }}
                  wrapperStyle={{
                    background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.text, boxShadow: "0 4px 12px rgba(0,0,0,0.20)", padding: 0,
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0]?.payload;
                    if (!p) return null;
                    const isNumericKey = Number.isFinite(Number(p.key));
                    const title = isNumericKey ? `C${p.key}` : p.name || String(p.key);
                    const fillColor = colorMode === "model" ? (modelColors[String(p.key)] || THEME.accent) : clusterColor(Number(p.key));
                    return (
                      <div style={{ background: THEME.bg, borderRadius: 8, color: THEME.text, padding: "10px 12px", border: `1px solid ${THEME.border}` }}>
                        <div style={{ fontWeight: 800, marginBottom: 6, color: fillColor }}>{title}</div>
                        <div style={{ display: "grid", rowGap: 2 }}>
                          <div><span style={{ opacity: 0.75 }}>Loyalty:</span> <span style={{ fontWeight: 600 }}>{Number.isFinite(p.x) ? `${p.x.toFixed(1)}%` : "—"}</span></div>
                          <div><span style={{ opacity: 0.75 }}>WTP:</span> <span style={{ fontWeight: 600 }}>{Number.isFinite(p.y) ? `${p.y.toFixed(1)}%` : "—"}</span></div>
                          <div><span style={{ opacity: 0.75 }}>Sample:</span> <span style={{ fontWeight: 600, color: THEME.text }}>{Number.isFinite(p.n) ? p.n.toLocaleString() : "—"}</span></div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={pointsA} name="" shape={<BigDot />}>
                  {pointsA.map((pt, i) => (
                    <Cell key={`att-cell-${pt.key}-${i}`} fill={colorMode === "model" ? (modelColors[String(pt.key)] || THEME.accent) : clusterColor(Number(pt.key))} />
                  ))}
                </Scatter>

                {attTrendOn && trendA && (
                  <>
                    <Line
                      name="Fit"
                      type="linear"
                      data={trendA.line}
                      dataKey="y" 
                      stroke={THEME.accent}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      strokeDasharray="6 4"
                    />
                  </>
                )}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Y-axis type (left, compact) */}
            <div style={{ position: "absolute", left: 0, top: "calc(50% - 50px)", zIndex: 2 }}>
              <select
                value={c1yType}
                onChange={(e) => {
                  const t = e.target.value;
                  setC1yType(t);
                  const opts = optionsForAxisType(t, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel });
                  setC1yKey((opts[0]?.value) || "");
                }}
                style={{ height: 24, width: 22, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="Y axis: pick category"
              >
                {AXIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {/* Y-axis key (under label) */}
            <div style={{ position: "absolute", left: 28, top: "calc(50% - 50px)", zIndex: 2 }}>
              <select
                value={c1yKey}
                onChange={(e) => setC1yKey(e.target.value)}
                style={{ height: 24, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="Y axis: pick variable"
              >
                {optionsForAxisType(c1yType, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel })
                  .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ position: "absolute", left: -5, top: "54%", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "left top", pointerEvents: "none" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
                {AXIS_TYPES.find(t => t.id === c1yType)?.label}
              </span>
            </div>

            {/* X-axis (bottom center): type + key */}
            <div style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
              <select
                value={c1xType}
                onChange={(e) => {
                  const t = e.target.value;
                  setC1xType(t);
                  const opts = optionsForAxisType(t, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel });
                  setC1xKey((opts[0]?.value) || "");
                }}
                style={{ height: 26, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="X axis: pick category"
              >
                {AXIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>

              <select
                value={c1xKey}
                onChange={(e) => setC1xKey(e.target.value)}
                style={{ height: 26, width: 380, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="X axis: pick variable"
              >
                {optionsForAxisType(c1xType, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel })
                  .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>



          </div>
        </div>

        {/* RIGHT attitudes (PR_MOST × Imagery) */}
        <div
          style={{
            position: "relative", background: THEME.panel, border: `1px solid ${THEME.border}`,
            borderRadius: 12, padding: 12, minHeight: "400px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <button
            onClick={() => { setDetailsSource("imagery"); setDetailsOpen(true); }}
            title="Open detailed view"
            style={{
              position: "absolute", top: 10, left: 10, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            Details
          </button>
          {/* Lock toggle — hidden but kept for future use
          <button
            onClick={() => setAttLocked((v) => !v)}
            title={attLocked ? "Unlock — follow filters" : "Lock — show full population"}
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: "none", borderRadius: 8, padding: 6, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s ease",
            }}
          >
            {attLocked ? <Lock size={16} strokeWidth={2} /> : <Unlock size={16} strokeWidth={2} />}
          </button>
          */}

          {/* Trendline toggle */}
          <button
            onClick={() => setImmTrendOn(v => !v)}
            title={immTrendOn ? "Hide regression line" : "Show regression line"}
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: 6, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s ease",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              opacity: immTrendOn ? 1 : 0.8,
            }}
          >
            <TrendingUp size={16} strokeWidth={2} />
          </button>

          <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 700, fontSize: 22, marginTop: 8, marginBottom: 0, color: THEME.text }}>
            {axis(c2xType)} &nbsp;×&nbsp; {axis(c2yType)}
          </div>


          {/* RIGHT chart body */}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {/* top label */}
            <div style={{ position: "absolute", top: 0, left: "50%", width: "70%", transform: "translateX(-50%)", fontStyle: "italic", fontWeight: 600, color: THEME.muted, fontSize: 10, textAlign: "center" }}>
              {prMostLabel || "Most Important Purchase Reason"}
              <span style={{ fontStyle: "normal", fontWeight: 400, margin: "0 6px" }}>×</span>
              {IMAGERY_OPTIONS.find(o => o.key === imageryKey)?.label || "Imagery"}
            </div>
            {immTrendOn && trendB && (
              <div style={{ position: "absolute", top: 8, right: 30, fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                R²: <span style={{ color: THEME.text }}>{trendB.r2.toFixed(2)}</span>
              </div>
            )}

            <div style={{ position: "absolute", top: 25, right: 30, fontSize: 13, color: THEME.muted, textAlign: "right" }}>
              Sample size: <span style={{ fontWeight: 700, color: THEME.text }}>{attBaseRows.length.toLocaleString()}</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 50, right: 20, bottom: 25, left: 5 }}>
                <CartesianGrid stroke={THEME.border} strokeDasharray="4 6" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={prMostLabel || "Most Important Purchase Reason"}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fill: THEME.muted, fontSize: 12 }}
                  stroke={THEME.border}
                  domain={axDomainB}
                  label={{ value: "Most Important Purchase Reason", position: "bottom", fill: THEME.text, fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="% Agree"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fill: THEME.muted, fontSize: 12 }}
                  stroke={THEME.border}
                  domain={ayDomainB}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: THEME.border }}
                  wrapperStyle={{
                    background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.text, boxShadow: "0 4px 12px rgba(0,0,0,0.20)", padding: 0,
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0]?.payload;
                    if (!p) return null;
                    const fillColor = p.color || (colorMode === "cluster" ? clusterColor(Number(p.key)) : (modelColors[String(p.key)] || THEME.accent));
                    return (
                      <div style={{ background: THEME.bg, borderRadius: 8, color: THEME.text, padding: "10px 12px", border: `1px solid ${THEME.border}` }}>
                        <div style={{ fontWeight: 800, marginBottom: 6, color: fillColor }}>{p.name}</div>
                        <div style={{ display: "grid", rowGap: 2 }}>
                          <div><span style={{ opacity: 0.75 }}>Selected:</span> <span style={{ fontWeight: 600 }}>{Number.isFinite(p.x) ? `${p.x.toFixed(1)}%` : "—"}</span></div>
                          <div><span style={{ opacity: 0.75 }}>Agree:</span> <span style={{ fontWeight: 600 }}>{Number.isFinite(p.y) ? `${p.y.toFixed(1)}%` : "—"}</span></div>
                          <div><span style={{ opacity: 0.75 }}>Sample:</span> <span style={{ fontWeight: 600, color: THEME.text }}>{Number.isFinite(p.n) ? p.n.toLocaleString() : "—"}</span></div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={pointsB} name="" shape={<BigDot />}>
                  {pointsB.map((pt, i) => (
                    <Cell key={`att-imm-cell-${pt.key}-${i}`} fill={pt.color} />
                  ))}
                </Scatter>

                {immTrendOn && trendB && (
                  <>
                    <Line
                      name="Fit"
                      type="linear"
                      data={trendB.line}
                      dataKey="y"
                      stroke={THEME.accent}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      strokeDasharray="6 4"
                    />
                  </>
                )}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Y-axis (right chart) */}
            <div style={{ position: "absolute", left: 0, top: "calc(50% - 70px)", zIndex: 2 }}>
              <select
                value={c2yType}
                onChange={(e) => {
                  const t = e.target.value;
                  setC2yType(t);
                  const opts = optionsForAxisType(t, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel });
                  setC2yKey((opts[0]?.value) || "");
                }}
                style={{ height: 28, width: 22, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="Y axis: pick category"
              >
                {AXIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ position: "absolute", left: 28, top: "calc(50% - 70px)", zIndex: 2 }}>
              <select
                value={c2yKey}
                onChange={(e) => setC2yKey(e.target.value)}
                style={{ height: 28, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="Y axis: pick variable"
              >
                {optionsForAxisType(c2yType, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel })
                  .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ position: "absolute", left: -5, top: "56%", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "left top", pointerEvents: "none" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
                {AXIS_TYPES.find(t => t.id === c2yType)?.label}
              </span>
            </div>

            {/* X-axis (bottom center) */}
            <div style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
              <select
                value={c2xType}
                onChange={(e) => {
                  const t = e.target.value;
                  setC2xType(t);
                  const opts = optionsForAxisType(t, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel });
                  setC2xKey((opts[0]?.value) || "");
                }}
                style={{ height: 26, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="X axis: pick category"
              >
                {AXIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>

              <select
                value={c2xKey}
                onChange={(e) => setC2xKey(e.target.value)}
                style={{ height: 26, width: 300, fontSize: 12, borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.panel, color: THEME.text }}
                title="X axis: pick variable"
              >
                {optionsForAxisType(c2xType, { LOYALTY_VARS, WTP_VARS, prMostOptions, IMAGERY_OPTIONS, varLabel })
                  .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>



          </div>
        </div>
      </div>

      {/* ---- Bottom row: Price (left) & Map (right) ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "stretch", gridAutoRows: "minmax(0, auto)" }}>
        {/* Price */}
        <div
          style={{
            background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 12,
            height: LAYOUT.bottomCardHeight, width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative",
          }}
        >
          <button
            onClick={() => { setDetailsSource("price"); setDetailsOpen(true); }}
            title="Open detailed view"
            style={{
              position: "absolute", top: 10, left: 10, zIndex: 2, background: THEME.panel, color: THEME.text,
              border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 10, cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            Details
          </button>

          {/* Lock toggle — hidden but kept for future use
          <button
            onClick={() => setPriceLocked((v) => !v)}
            title={priceLocked ? "Unlock — follow filters" : "Lock — show full population"}
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 2, background: THEME.panel, color: THEME.text,
              border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s ease",
            }}
          >
            {priceLocked ? <Lock size={16} strokeWidth={2} /> : <Unlock size={16} strokeWidth={2} />}
          </button>
          */}

          <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 700, fontSize: 22, marginTop: 8, marginBottom: 0, color: THEME.text }}>
            Transaction Price
          </div>
          <div style={{ position: "absolute", top: 40, right: 40, fontSize: 13, fontWeight: 500, color: THEME.muted, pointerEvents: "none" }}>
            Sample size: <span style={{ color: THEME.text, fontWeight: 600 }}>{activePriceSampleSize.toLocaleString()}</span>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const groupingKey = colorMode === "cluster" ? "cluster" : "model";
                const orderKeys = priceGroupKeys;
                const priceSeries = buildPriceSeriesByGroupFast(priceBaseRows, groupingKey, orderKeys);
                if (!priceSeries.length) return <div style={{ fontSize: 12, opacity: 0.75 }}>No FIN_PRICE_UNEDITED data available in current scope.</div>;

                const maxPct = priceSeries.reduce((m, s) => Math.max(m, ...s.data.map((d) => (Number.isFinite(d.pct) ? d.pct : 0))), 0);
                const yMax = Math.ceil((maxPct + 2) / 5) * 5;
                const pctFmt = (v) => `${v.toFixed(0)}%`;
                const xLabels = priceSeries[0].data.map((d) => d.label);

                return (
                  <AreaChart margin={{ top: 20, right: 20, bottom: -10, left: 0 }}>
                    <CartesianGrid stroke={THEME.border} strokeDasharray="4 6" vertical={false} />
                    <XAxis
                      dataKey="label" type="category" allowDuplicatedCategory={false}
                      tick={{ fill: THEME.muted, fontSize: 11 }} stroke={THEME.border}
                      interval={0} angle={-20} textAnchor="end" height={52} ticks={xLabels}
                    />
                    <YAxis domain={[0, yMax]} tickFormatter={pctFmt} tick={{ fill: THEME.muted, fontSize: 12 }} stroke={THEME.border} allowDecimals={false} />
                    <Tooltip
                      isAnimationActive={false}
                      content={({ active, payload = [], label }) => {
                        if (!active || !payload.length) return null;
                        const byName = new Map();
                        for (const entry of payload) {
                          if (entry?.dataKey !== "pct") continue;
                          const prev = byName.get(entry.name);
                          const score = entry?.stroke ? 2 : 1;
                          const prevScore = prev?.stroke ? 2 : prev ? 1 : 0;
                          if (score >= prevScore) byName.set(entry.name, entry);
                        }
                        const unique = Array.from(byName.values());
                        return (
                          <div style={{ background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "10px 12px", color: THEME.text, boxShadow: "0 4px 12px rgba(0,0,0,0.20)" }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                            {unique.map((entry, i) => {
                              let seriesColor = entry?.stroke || entry?.color;
                              if (!seriesColor) {
                                const rawKey = entry?.name ?? "";
                                const isCluster = /^C\d+$/i.test(rawKey) && colorMode === "cluster";
                                const key = isCluster ? Number(rawKey.slice(1)) : String(rawKey);
                                seriesColor = colorMode === "cluster" ? clusterColor(Number(key)) : (modelColors[String(key)] || THEME.accent);
                              }
                              const pct = Number(entry?.value);
                              const count = entry?.payload?.count ?? 0;
                              return (
                                <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                                  <span style={{ color: seriesColor, fontWeight: 700 }}>{entry.name}:</span>
                                  <span style={{ fontWeight: 500 }}>{Number.isFinite(pct) ? pct.toFixed(1) : "—"}%</span>
                                  <span style={{ color: THEME.muted }}> ({count.toLocaleString?.() ?? "—"})</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    <defs>
                      {orderKeys.map((k) => {
                        const id = `priceFill_${String(k).replace(/\s+/g, "_")}`;
                        const col = colorMode === "model" ? (modelColors[String(k)] || THEME.accent) : clusterColor(Number(k));
                        return (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={col} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={col} stopOpacity={0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    {priceSeries.map((s) => {
                      const col = colorMode === "model" ? (modelColors[String(s.key)] || THEME.accent) : clusterColor(Number(s.key));
                      const fillId = `url(#priceFill_${String(s.key).replace(/\s+/g, "_")})`;
                      const name = colorMode === "cluster" ? `C${s.key}` : String(s.key);
                      return (
                        <React.Fragment key={`series-${String(s.key)}`}>
                          <Area type="monotone" name={name} data={s.data} dataKey="pct" fill={fillId} stroke="none"
                                isAnimationActive={true} animationId={animToken} animationDuration={650} animationEasing="ease-in-out" />
                          <Line type="monotone" name={name} data={s.data} dataKey="pct" stroke={col} strokeWidth={2} dot={false} activeDot={false}
                                isAnimationActive={true} animationId={animToken} animationDuration={650} animationEasing="ease-in-out" />
                        </React.Fragment>
                      );
                    })}
                  </AreaChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Map */}
        <div
          style={{
            background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 12,
            height: LAYOUT.bottomCardHeight, boxSizing: "border-box", position: "relative", display: "flex", flexDirection: "column",
          }}
        >
          <button
            onClick={() => { setDetailsSource("map"); setDetailsOpen(true); }}
            title="Open detailed view"
            style={{
              position: "absolute", top: 10, left: 10, zIndex: 2,
              background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: "6px 10px", fontSize: 10, cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            Details
          </button>
          
          {/* Lock toggle — hidden but kept for future use
          <button
            onClick={() => setMapLocked((v) => !v)}
            title={mapLocked ? "Unlock — map follows filters" : "Lock — map shows full population"}
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 2, background: THEME.panel, color: THEME.text,
              border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s ease",
            }}
          >
            {mapLocked ? <Lock size={16} strokeWidth={2} /> : <Unlock size={16} strokeWidth={2} />}
          </button>
          */}

          {selectedStateName && (
            <button
              onClick={() => setSelectedStateName(null)}
              style={{
                position: "absolute", top: 10, right: 46, background: THEME.panel, color: THEME.text,
                border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, cursor: "pointer",
              }}
              title="Clear state filter"
            >
              Clear
            </button>
          )}

          <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 700, fontSize: 22, marginTop: 8, marginBottom: 0, color: THEME.text }}>
            State of Residence
          </div>

          <div style={{ flex: 1, borderRadius: 8, overflow: "hidden", minHeight: 0 }}>
            <ComposableMap projection="geoAlbersUsa" style={{ width: "100%", height: "100%" }}>
              <Geographies geography={US_TOPO}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const name = geo.properties.name;
                    const pct = stateAgg.pcts.get(name) || 0;
                    const t = stateAgg.maxPct > 0 ? Math.min(1, pct / stateAgg.maxPct) : 0;

                    const isSelected = selectedStateName === name;
                    const baseFill = blendHex(THEME.panel, THEME.accent, t);
                    const fill = isSelected ? blendHex(baseFill, "#ffffff", 0.25) : baseFill;
                    const stroke = isSelected ? THEME.accent : THEME.border;
                    const strokeWidth = isSelected ? 2 : 0.75;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => setSelectedStateName(name)}
                        onMouseEnter={() => setHoverState({ name, pct, count: stateAgg.counts.get(name) || 0 })}
                        onMouseLeave={() => setHoverState(null)}
                        style={{
                          default: { fill, stroke, strokeWidth, outline: "none", cursor: "pointer" },
                          hover: { fill: blendHex(fill, "#ffffff", 0.15), stroke, strokeWidth: Math.max(1, strokeWidth), outline: "none", cursor: "pointer" },
                          pressed: { fill, stroke, strokeWidth: Math.max(1, strokeWidth), outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>

          <div style={{ marginTop: 10, position: "relative", minHeight: 22 }}>
            <div style={{ position: "absolute", bottom: 0, right: 14, fontSize: 13, opacity: 0.85, textAlign: "right" }}>
              {hoverState ? (
                <>
                  {hoverState.name}: <span style={{ fontWeight: 700 }}>{hoverState.pct.toFixed(1)}%</span>
                  {stateAgg.counts.get(hoverState.name) || 0 ? ` (${(stateAgg.counts.get(hoverState.name) || 0).toLocaleString()})` : ""}
                </>
              ) : selectedStateName ? (
                `Filtering Demographics to ${selectedStateName} • ${scopeRows.length.toLocaleString()} records`
              ) : stateAgg.total > 0 ? (
                <>Sample size: <span style={{ fontWeight: 700 }}>{stateAgg.total.toLocaleString()}</span></>
              ) : (
                "No state data in current scope"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Details dialog ---- */}
      {detailsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => { setDetailsOpen(false); setDetailsSource(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 94vw)", maxHeight: "84vh", overflowY: "auto",
              background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 12,
              boxShadow: "0 12px 28px rgba(0,0,0,0.35)", color: THEME.text,
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderBottom: `1px solid ${THEME.border}`, position: "sticky", top: 0,
                background: THEME.bg, borderTopLeftRadius: 12, borderTopRightRadius: 12, zIndex: 1,
              }}
            >

              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {detailsSource === "clusters"
                  ? "Clustering UMAP Scatter Plot"
                  : detailsSource === "attitudes"
                  ? `${axis(c1xType)} · ${axis(c1yType)}`
                  : detailsSource === "imagery"
                  ? `${axis(c2xType)} · ${axis(c2yType)}`
                  : detailsSource === "price"
                  ? "Transaction Price Distribution"
                  : detailsSource === "map"
                  ? "State of Residence Map"
                  : "Details"}
              </div>


              <button
                onClick={() => { setDetailsOpen(false); setDetailsSource(null); }}
                style={{
                  background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
                  borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer",
                }}
                title="Close"
              >
                Close
              </button>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              {detailsSource === "clusters" && (
                <div
                  style={{
                    padding: "10px 12px", background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
                    A UMAP projection transforms many variables into a 2D picture so nearby
                    points are more similar than distant ones. Each point is a respondent;
                    color by <i>Cluster</i> or <i>Model</i>. “Collapse points” pulls
                    respondents toward their group centroid to reveal structure. Click on any
                    of the clusters on the group to reveal its associated data.
                  </div>
                </div>
              )}

              {detailsSource === "attitudes" && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: THEME.panel,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
                    This chart compares each cluster or model’s share of customers who agree with selected
                    <i> loyalty statements </i> against their agreement with <i> willingness-to-pay factors.</i> Each dot represents a group’s percentage of respondents showing positive sentiment on both dimensions.
                    Use the dropdowns on the X and Y axes to explore how loyalty and price sensitivity interact
                    across customer segments.
                  </div>
                </div>
              )}

              {detailsSource === "imagery" && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: THEME.panel,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
                    Each dot shows a cluster or model’s share of respondents who selected the chosen
                    <i> Most Important Purchase Reason </i> (X-axis) versus the share who agree with the
                    selected <i> Imagery </i> statement (Y-axis). Use the dropdowns on the X and Y axes to explore relationships between
                    why customers purchase their vehicle and how they view it.
                  </div>
                </div>
              )}

              {detailsSource === "price" && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: THEME.panel,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
                    This chart shows how respondents within each cluster or model are distributed across different purchase price ranges (Under $30k → $110k+). Lines indicate the distribution shape, and you can use the color toggle to view by
                    <i> Cluster</i> or <i> Model</i>. The hover tooltips shows percent and count per bucket.
                  </div>
                </div>
              )}

              {detailsSource === "map" && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: THEME.panel,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
                    This map highlights the geographic distribution of respondents by state. Brighter shades
                    represent states with a higher share of respondents in the current selection. Click on
                    any state to filter other panels to residents from that state, or use the Clear button to reset.
                  </div>
                </div>
              )}

              {zoomCluster != null && (
                <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Cluster Persona (C{zoomCluster})</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>{getPersonaForCluster(zoomCluster).summary}</div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}

      {/* ---- Persona modal ---- */}
      {showPersona && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPersona(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 94vw)", maxHeight: "84vh", overflowY: "auto", background: THEME.bg,
              border: `1px solid ${THEME.border}`, borderRadius: 12, boxShadow: "0 12px 28px rgba(0,0,0,0.35)", color: THEME.text,
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderBottom: `1px solid ${THEME.border}`, position: "sticky", top: 0,
                background: THEME.bg, borderTopLeftRadius: 12, borderTopRightRadius: 12, zIndex: 1,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {(() => {
                  const persona = getPersonaForCluster(zoomCluster);
                  const groupLabel =
                    datasetMode === "CORE"
                      ? (group === "SUV" ? "SUV" : "Pickup")
                      : (group === "LargePickup" ? "Large Pickups" : "Mid SUVs");
                  return `${persona.title} — ${groupLabel}`;
                })()}
              </div>
              <button
                onClick={() => setShowPersona(false)}
                style={{
                  background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`,
                  borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer",
                }}
                title="Close"
              >
                Close
              </button>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              {(() => {
                const persona = getPersonaForCluster(zoomCluster);
                return (
                  <>
                    <div style={{ padding: "10px 12px", background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 8 }}>
                      <div style={{ fontSize: 14, opacity: 0.9, whiteSpace: "pre-line" }}>{persona.summary}</div>
                    </div>

                    {/* --- Cluster Facts (manual placeholders) --- */}
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "stretch",
                      }}
                    >
                      {/* LEFT: Persona image */}
                      <div
                        style={{
                          flex: "1 1 50%",
                          background: THEME.panel,
                          border: `1px solid ${THEME.border}`,
                          borderRadius: 8,
                          height: "100%",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={
                            zoomCluster === 2
                              ? "/personas/suv-cluster-2.png"
                              : "/personas/suv-cluster-1.png"
                          }
                          alt={`Cluster ${zoomCluster} persona visual`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      {/* RIGHT: Cluster Facts */}
                      <div
                        style={{
                          flex: "1 1 50%",
                          background: THEME.panel,
                          border: `1px solid ${THEME.border}`,
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 26, marginLeft: 8, }}>Group Details</div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "80px 1fr",
                            rowGap: 8,
                            columnGap: 8,
                            alignItems: "start",
                            lineHeight: 2,
                          }}
                        >
                          <div style={{ color: THEME.muted, fontSize: 14, fontWeight: 600, marginLeft: 8, }}>Gender:</div>
                          <div style={{ color: THEME.text, fontSize: 14, fontWeight: 700 }}>70% male / 30% female</div>

                          <div style={{ color: THEME.muted, fontSize: 14, fontWeight: 600, marginLeft: 8, }}>Age:</div>
                          <div style={{ color: THEME.text, fontSize: 14, fontWeight: 700 }}>55-75 years old</div>

                          <div style={{ color: THEME.muted, fontSize: 14, fontWeight: 600, marginLeft: 8, }}>Location:</div>
                          <div style={{ color: THEME.text, fontSize: 14, fontWeight: 700 }}>Suburban or small town</div>

                          <div style={{ color: THEME.muted, fontSize: 14, fontWeight: 600, marginLeft: 8, }}>Occupation:</div>
                          <div style={{ color: THEME.text, fontSize: 14, fontWeight: 700 }}>Semi-retired or mid-level manager</div>

                          <div style={{ color: THEME.muted, fontSize: 14, fontWeight: 600, marginLeft: 8, }}>Income:</div>
                          <div style={{ color: THEME.text, fontSize: 14, fontWeight: 700 }}>$150k - $250k</div>

                          <div style={{ color: THEME.muted, fontSize: 14, fontWeight: 600, marginLeft: 8, }}>Hobbies:</div>
                          <div style={{ color: THEME.text, fontSize: 14, fontWeight: 700 }}>Leisure, physical, and outdoors</div>
                        </div>
                      </div>
                    </div>



                    {/* Donut: % of respondents by current model within this cluster */}
                    <div
                      style={{
                        background: THEME.panel,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
                        Model Ownership Mix
                      </div>

                      {clusterModelShare.total === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          No respondents available for this cluster.
                        </div>
                      ) : (
                        (() => {
                          const sortedData = [...clusterModelShare.data].sort((a, b) => b.value - a.value);
                          return (
                            <div style={{ width: "100%", height: 260 }}>
                              <ResponsiveContainer>
                                <PieChart>
                                  <Pie
                                    data={sortedData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={64}
                                    outerRadius={100}
                                    stroke={THEME.bg}
                                    strokeWidth={1}
                                    startAngle={90}      /* 12 o’clock */
                                    endAngle={-270}      /* clockwise */
                                    labelLine={true}
                                    /* OUTSIDE label: vehicle name only */
                                    label={({ name, cx, cy, midAngle, outerRadius }) => {
                                      const RAD = Math.PI / 180;
                                      const r = outerRadius + 20; // push name outside the slice
                                      const x = cx + r * Math.cos(-midAngle * RAD);
                                      const y = cy + r * Math.sin(-midAngle * RAD);
                                      return (
                                        <text
                                          x={x}
                                          y={y}
                                          textAnchor={x > cx ? "start" : "end"}
                                          dominantBaseline="central"
                                          style={{ fill: THEME.text, fontSize: 12, fontWeight: 600 }}
                                        >
                                          {name}
                                        </text>
                                      );
                                    }}
                                  >
                                    {sortedData.map((d, i) => {
                                      const color =
                                        d.name === "Other" ? THEME.muted : (modelColors[d.name] || THEME.accent);
                                      return <Cell key={`slice-${d.name}-${i}`} fill={color} />;
                                    })}

                                    {/* INSIDE label: rounded percentage */}
                                    <LabelList
                                      dataKey="value"
                                      position="inside"
                                      formatter={(v) => `${Math.round(v)}%`}
                                      style={{ fontSize: 11, fontWeight: 700, fill: "#ffffff" }}
                                    />
                                  </Pie>


                                  {/* Center label */}
                                  <g>
                                    <text
                                      x="50%"
                                      y="50%"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      style={{ fill: THEME.text, fontWeight: 800, fontSize: 24 }}
                                    >
                                      {clusterModelShare.total.toLocaleString()}
                                    </text>
                                    <text
                                      x="50%"
                                      y="50%"
                                      dy="1.2em"
                                      textAnchor="middle"
                                      dominantBaseline="hanging"
                                      style={{ fill: THEME.muted, fontSize: 11 }}
                                    >
                                      Customers
                                    </text>
                                  </g>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

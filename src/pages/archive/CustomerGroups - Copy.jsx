// src/pages/CustomerGroups.jsx
import React, { useMemo, useState, useRef } from "react";

/**
 * Customer Groups — Layout v1 (+ Category/Chip selectors)
 * Row 0: Choose category + chips (mirrors Market Simulation)
 * Row 1: K-means scatter (with controls) | Radar compare
 * Row 2: Line chart (Transaction Price over Price Ranges) | Perception Map
 * Row 3: US Bubble Map (location + population)
 *
 * No external libs. All SVG.
 */

const METRICS = [
  { key: "price_sensitivity", label: "Price Sensitivity" },
  { key: "loyalty", label: "Loyalty" },
  { key: "engagement", label: "Engagement" },
  { key: "spend", label: "Spend" },
  { key: "support", label: "Support Tickets" },
  { key: "nps", label: "NPS" },
];

// Put this near the top of CustomerGroups.jsx (or compute from your real source)
const demoPerceptionData = [
  { model: "Ford Bronco", attribute: "Adventure", value: 26 },
  { model: "Ford Bronco", attribute: "Tech-forward", value: 8 },
  { model: "Ford Bronco", attribute: "Practical", value: 12 },
  { model: "Toyota 4Runner", attribute: "Adventure", value: 22 },
  { model: "Toyota 4Runner", attribute: "Practical", value: 18 },
  { model: "Rivian R1S", attribute: "Tech-forward", value: 24 },
  { model: "Rivian R1S", attribute: "Luxury", value: 14 },
  { model: "Tesla Model Y", attribute: "Tech-forward", value: 30 },
  { model: "Tesla Model Y", attribute: "Luxury", value: 12 },
  { model: "Jeep Wrangler", attribute: "Adventure", value: 28 },
  { model: "Jeep Wrangler", attribute: "Practical", value: 10 },
];

// Distinct cluster colors (works for dark & light themes)
const CLUSTER_COLORS = ["#FF5432", "#0CA5E1", "#8B5CF6", "#22C55E", "#F59E0B"];

/* --- Palettes to mirror Market Simulation --- */
const SUV_COLORS = {
  "S SUV": "#FFD32A",
  "M SUV": "#FF9B1A",
  "L SUV": "#FF4A32",
  "XL SUV": "#C21807",
};
const PICKUP_COLORS = {
  "S Pickup": "#1BD15C",
  "M Pickup": "#00A890",
  "L Pickup": "#1F6FFF",
  "XL Pickup": "#7A2AEF",
};
const PT_COLORS = {
  ICE: "#6B7280",
  HEV: "#10B981",
  PHEV: "#F59E0B",
  BEV: "#3B82F6",
};
const sizesOrder = ["S", "M", "L", "XL"];
const DEFAULT_SELECTED = {
  segments: ["M SUV", "L Pickup"],
  powertrains: ["ICE", "HEV", "PHEV", "BEV"],
};

function getKeyColor(label) {
  return SUV_COLORS[label] || PICKUP_COLORS[label] || PT_COLORS[label] || null;
}

export default function CustomerGroups({ COLORS, useStyles }) {
  const styles = useStyles(COLORS);

  // theme helper
  const isDarkHex = (hex) => {
    const h = hex?.replace("#", "");
    if (!h || (h.length !== 6 && h.length !== 3)) return false;
    const full =
      h.length === 3
        ? h
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return brightness < 0.5;
  };
  const sigSrc = isDarkHex(COLORS.panel)
    ? "/signature-fog.png"
    : "/signature-moonstone.png";

  // Controls / state
  const [k, setK] = useState(4);
  const [noise, setNoise] = useState(0.35); // 0..1
  const [ptSize, setPtSize] = useState(3.5); // px radius
  const [focusOnly, setFocusOnly] = useState(false);
  const [selected, setSelected] = useState(0); // selected cluster id
  const [hover, setHover] = useState(null); // {x, y, customer}
  const svgRef = useRef(null);

  /* ---- NEW: Category + selections (UI parity with Market Simulation) ---- */
  const [mode, setMode] = useState("segments"); // 'segments' | 'powertrains'
  const [selectedSegments, setSelectedSegments] = useState(
    DEFAULT_SELECTED.segments
  );
  const [selectedPTs, setSelectedPTs] = useState(DEFAULT_SELECTED.powertrains);

  const suvAccent = "#FF5432";
  const PICKUP_BLUE = "#60B6FF";
  const optionStyle = { background: COLORS.panel, color: COLORS.text };

  const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  const chipFixed = (active, label) => {
    const base =
      getKeyColor(label) || (/Pickup/i.test(label) ? PICKUP_BLUE : suvAccent);
    const alpha = isDarkHex(COLORS.panel) ? 0.22 : 0.14;
    return {
      padding: "6px 10px",
      borderRadius: 10,
      border: `1px solid ${active ? base : COLORS.border}`,
      background: active ? `rgba(${hexToRgb(base)}, ${alpha})` : "transparent",
      color: COLORS.text,
      cursor: "pointer",
      fontSize: 13,
      transition: "border-color 120ms ease, background-color 120ms ease",
      minWidth: 90,
      textAlign: "center",
    };
  };

  function toggleSelection(label) {
    if (mode === "segments") {
      setSelectedSegments((prev) =>
        prev.includes(label)
          ? prev.filter((x) => x !== label)
          : [...prev, label]
      );
    } else {
      setSelectedPTs((prev) =>
        prev.includes(label)
          ? prev.filter((x) => x !== label)
          : [...prev, label]
      );
    }
  }

  function renderSegmentChips() {
    const suvLabels = sizesOrder.map((s) => `${s} SUV`);
    const pickupLabels = sizesOrder.map((s) => `${s} Pickup`);
    return (
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, max-content)",
            gap: 8,
            justifyContent: "start",
          }}
        >
          {suvLabels.map((label) => {
            const active = selectedSegments.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleSelection(label)}
                style={chipFixed(active, label)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, max-content)",
            gap: 8,
            justifyContent: "start",
          }}
        >
          {pickupLabels.map((label) => {
            const active = selectedSegments.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleSelection(label)}
                style={chipFixed(active, label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---- End NEW UI block ---- */

  // Synthetic data
  const { customers, centers } = useMemo(
    () => makeCustomers(k, noise),
    [k, noise]
  );

  // Aggregations
  const overall = useMemo(() => summarize(customers), [customers]);
  const clusterAgg = useMemo(
    () =>
      range(k).map((c) => summarize(customers.filter((d) => d.cluster === c))),
    [customers, k]
  );

  // Row 2 — Price line over ranges
  const priceLine = useMemo(() => buildPriceBins(customers), [customers]);

  // Row 2 — Perception points (dummy “perceptions” for demo)
  const perceptions = useMemo(() => makePerceptionPoints(), []);

  // Row 3 — US bubbles (demo cities + populations)
  const bubbles = useMemo(() => makeUSBubbleData(), []);

  // Derived for rendering
  const scatterData = useMemo(
    () => customers.filter((d) => (focusOnly ? d.cluster === selected : true)),
    [customers, focusOnly, selected]
  );

  // styles
  const card = {
    background: COLORS.panel,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    boxShadow: isDarkHex(COLORS.panel)
      ? "0 1px 4px rgba(0,0,0,0.4)"
      : "0 1px 4px rgba(0,0,0,0.1)",
    padding: 16,
  };

  const rowTwoCol = {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 1.2fr) minmax(340px, 1fr)",
    gap: 16,
    alignItems: "stretch",
  };

  const controlsRow = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 12,
  };

  const label = { color: COLORS.muted, fontSize: 12, marginBottom: 6 };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "transparent",
          border: "none",
          padding: 18,
          display: "grid",
          gap: 10,
        }}
      >
        <h1 style={{ ...styles.h1, margin: 0 }}>
          <span
            style={{ color: COLORS.accent, transition: "color 120ms ease" }}
          >
            Customer Groups
          </span>
        </h1>

        <p style={{ color: COLORS.muted, fontSize: 20, margin: 0 }}>
          Explore customer clusters. Hover points for details, click to focus a
          cluster.
        </p>

        {/* --- NEW: Category + chip selectors (placement matches Market Simulation) --- */}
        <div style={{ marginTop: 30, marginBottom: 2 }}>
          <div style={{ color: COLORS.muted }}>Choose category</div>
        </div>

        <div
          style={{ display: "flex", gap: 8, marginTop: 0, marginBottom: 20 }}
        >
          {[
            { id: "segments", label: "Segments" },
            { id: "powertrains", label: "Powertrains" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border:
                  mode === m.id
                    ? isDarkHex(COLORS.panel)
                      ? "1px solid #FFFFFF"
                      : "1px solid #FF5432"
                    : `1px solid ${COLORS.border}`,
                background:
                  mode === m.id
                    ? isDarkHex(COLORS.panel)
                      ? "rgba(255,255,255,0.22)"
                      : "rgba(255,84,50,0.18)"
                    : "transparent",
                fontSize: 16,
                color: COLORS.text,
                cursor: "pointer",
                transition:
                  "background-color 120ms ease, border-color 120ms ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Chips */}
        <div style={{ marginTop: 6 }}>
          <div style={{ color: COLORS.muted, marginBottom: 12 }}>
            {mode === "segments" ? "Segments" : "Powertrains"}: choose one or
            more
          </div>

          {mode === "segments" ? (
            renderSegmentChips()
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {["ICE", "HEV", "PHEV", "BEV"].map((k) => {
                const active = selectedPTs.includes(k);
                const c = getKeyColor(k) || suvAccent;
                const alpha = isDarkHex(COLORS.panel) ? 0.22 : 0.14;
                return (
                  <button
                    key={k}
                    onClick={() => toggleSelection(k)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: `1px solid ${active ? c : COLORS.border}`,
                      background: active
                        ? `rgba(${hexToRgb(c)}, ${alpha})`
                        : "transparent",
                      color: COLORS.text,
                      cursor: "pointer",
                      fontSize: 13,
                      transition:
                        "border-color 120ms ease, background-color 120ms ease",
                      minWidth: 90,
                      textAlign: "center",
                    }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* --- End NEW block --- */}
      </div>

      {/* Row 1: Scatter | Radar */}
      <div style={{ marginTop: 12 }}>
        <div style={rowTwoCol}>
          <ScatterClusters
            COLORS={COLORS}
            svgRef={svgRef}
            data={scatterData}
            allData={customers}
            centers={centers}
            k={k}
            setK={setK}
            noise={noise}
            setNoise={setNoise}
            ptSize={ptSize}
            setPtSize={setPtSize}
            focusOnly={focusOnly}
            setFocusOnly={setFocusOnly}
            selected={selected}
            setSelected={setSelected}
            onHover={setHover}
          />
          <RadarCompare
            COLORS={COLORS}
            metrics={METRICS}
            overall={overall}
            selectedAgg={clusterAgg[selected]}
            selectedColor={CLUSTER_COLORS[selected % CLUSTER_COLORS.length]}
          />
        </div>
      </div>

      {/* Row 2: Line (price over ranges) | Perception Map */}
      <div style={{ marginTop: 12 }}>
        <div style={rowTwoCol}>
          <PriceLineOverRanges COLORS={COLORS} series={priceLine} />
          <PerceptionMap COLORS={COLORS} data={demoPerceptionData} />
        </div>
      </div>

      {/* Row 3: US Bubble Map */}
      <div style={{ marginTop: 12 }}>
        <USBubbleMap COLORS={COLORS} bubbles={bubbles} />
      </div>

      {/* Signature */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
          paddingRight: 10,
        }}
      >
        <img
          src={sigSrc}
          alt="Scout Almanac Pro signature"
          style={{ width: 50, height: "auto", opacity: 0.9 }}
        />
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: "fixed",
            left: hover.x + 14,
            top: hover.y + 14,
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
            padding: "8px 10px",
            borderRadius: 8,
            pointerEvents: "none",
            zIndex: 50,
            minWidth: 180,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Customer #{hover.customer.id} — Cluster {hover.customer.cluster + 1}
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>
            Engagement: <strong>{hover.customer.engagement.toFixed(1)}</strong>
            <br />
            Spend: <strong>${hover.customer.spend.toFixed(0)}</strong>
            <br />
            NPS: <strong>{hover.customer.nps.toFixed(0)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Scatter Plot (with integrated controls) -------------------- */

function ScatterClusters({
  COLORS,
  svgRef,
  data,
  allData,
  centers,
  k,
  setK,
  noise,
  setNoise,
  ptSize,
  setPtSize,
  focusOnly,
  setFocusOnly,
  selected,
  setSelected,
  onHover,
}) {
  const w = 560,
    h = 400,
    pad = 30;

  // local styles
  const label = { color: COLORS.muted, fontSize: 12, marginBottom: 6 };
  const controlsRow = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  };

  // domains
  const minX = 0,
    maxX = 100;
  const minY = 0,
    maxY = Math.max(1000, Math.max(...allData.map((d) => d.spend)));

  const mapX = (x) => pad + ((x - minX) / (maxX - minX)) * (w - pad * 2);
  const mapY = (y) => h - pad - ((y - minY) / (maxY - minY)) * (h - pad * 1.6); // reduced bottom buffer

  const axisColor = COLORS.border;
  const tickColor = COLORS.muted;

  function handleMove(e, customer) {
    onHover({ x: e.clientX, y: e.clientY, customer });
  }
  function clearHover() {
    onHover(null);
  }

  return (
    <div
      style={{
        background: COLORS.panel,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Integrated Controls */}
      <div style={controlsRow}>
        <div>
          <div style={label}>Clusters (K)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="range"
              min={2}
              max={5}
              step={1}
              value={k}
              onChange={(e) => {
                const next = +e.target.value;
                setSelected(Math.min(selected, next - 1));
                setK(next);
              }}
              style={{ width: "100%", accentColor: COLORS.accent }}
            />
            <strong>{k}</strong>
          </div>
        </div>
        <div>
          <div style={label}>Noise (spread)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={noise}
              onChange={(e) => setNoise(+e.target.value)}
              style={{ width: "100%", accentColor: COLORS.accent }}
            />
            <strong>{noise.toFixed(2)}</strong>
          </div>
        </div>
        <div>
          <div style={label}>Point Size</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="range"
              min={2}
              max={6}
              step={0.5}
              value={ptSize}
              onChange={(e) => setPtSize(+e.target.value)}
              style={{ width: "100%", accentColor: COLORS.accent }}
            />
            <strong>{ptSize.toFixed(1)}</strong>
          </div>
        </div>
        <div>
          <div style={label}>Focus Selected Cluster</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={focusOnly}
              onChange={(e) => setFocusOnly(e.target.checked)}
            />
            <span>Show only selected</span>
          </label>
        </div>
      </div>

      {/* Chart */}
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        onMouseLeave={clearHover}
        role="img"
        style={{ display: "block" }}
      >
        {/* Axes */}
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke={axisColor}
        />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={axisColor} />

        {/* X ticks */}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const x = pad + t * (w - pad * 2);
          const y = h - pad;
          const xv = minX + t * (maxX - minX);
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={y} x2={x} y2={y + 4} stroke={axisColor} />
              <text
                x={x}
                y={y + 14}
                fontSize="9"
                textAnchor="middle"
                fill={tickColor}
              >
                {xv.toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Y ticks */}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const y = h - pad - t * (h - pad * 2);
          const yv = minY + t * (maxY - minY);
          return (
            <g key={`yt-${i}`}>
              <line x1={pad - 4} y1={y} x2={pad} y2={y} stroke={axisColor} />
              <text
                x={pad - 8}
                y={y + 3}
                fontSize="9"
                textAnchor="end"
                fill={tickColor}
              >
                ${formatK(yv)}
              </text>
            </g>
          );
        })}

        {/* Centers */}
        {centers.slice(0, k).map((c, i) => {
          const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
          const active = i === selected;
          return (
            <g
              key={`c-${i}`}
              onClick={() => setSelected(i)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={mapX(c.engagement)}
                cy={mapY(c.spend)}
                r={8}
                fill={color}
                opacity={active ? 0.95 : 0.6}
                stroke={COLORS.panel}
                strokeWidth="1.5"
              />
              <text
                x={mapX(c.engagement) + 10}
                y={mapY(c.spend) + 4}
                fontSize="11"
                fill={COLORS.text}
              >
                C{i + 1}
              </text>
            </g>
          );
        })}

        {/* Points */}
        {data.map((d) => {
          const color = CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length];
          const dim = focusOnly && d.cluster !== selected;
          return (
            <circle
              key={d.id}
              cx={mapX(d.engagement)}
              cy={mapY(d.spend)}
              r={ptSize}
              fill={color}
              opacity={dim ? 0.25 : 0.65}
              onMouseMove={(e) => handleMove(e, d)}
              onMouseDown={() => setSelected(d.cluster)}
              style={{ cursor: "pointer" }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------- Radar Chart -------------------- */

function RadarCompare({
  COLORS,
  metrics,
  overall,
  selectedAgg,
  selectedColor,
}) {
  const w = 360,
    h = 300,
    cx = w / 2,
    cy = h / 2,
    r = 130;
  const rings = 4;

  const keys = metrics.map((m) => m.key);
  const angles = keys.map(
    (_, i) => (Math.PI * 2 * i) / keys.length - Math.PI / 2
  );

  // normalize 0..1 per metric using overall min/max
  const norm = {};
  keys.forEach((k) => {
    const lo = overall.min[k];
    const hi = overall.max[k] === lo ? lo + 1 : overall.max[k];
    norm[k] = (v) => (v - lo) / (hi - lo);
  });

  const selPoints = keys.map((k, i) => {
    const t = norm[k](selectedAgg.avg[k]);
    return polar(cx, cy, r * clamp01(t), angles[i]);
  });
  const allPoints = keys.map((k, i) => {
    const t = norm[k](overall.avg[k]);
    return polar(cx, cy, r * clamp01(t), angles[i]);
  });

  return (
    <div
      style={{
        background: COLORS.panel,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ color: COLORS.muted, marginBottom: 30 }}>
        Traits radar — <strong style={{ color: selectedColor }}>Cluster</strong>{" "}
        vs Overall
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img">
        {range(rings).map((i) => {
          const rr = (r * (i + 1)) / rings;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={rr}
              fill="none"
              stroke={COLORS.border}
            />
          );
        })}
        {angles.map((a, i) => {
          const { x, y } = polar(cx, cy, r, a);
          return (
            <g key={`spoke-${i}`}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={COLORS.border} />
              <text
                x={x}
                y={y}
                fontSize="8"
                textAnchor={x < cx ? "end" : x > cx ? "start" : "middle"}
                dominantBaseline={
                  y < cy ? "text-after-edge" : "text-before-edge"
                }
                fill={COLORS.muted}
                style={{ pointerEvents: "none" }}
              >
                {METRICS[i].label}
              </text>
            </g>
          );
        })}
        <path
          d={polygonPath(allPoints)}
          fill={COLORS.text}
          opacity="0.15"
          stroke={COLORS.text}
          strokeOpacity="0.35"
        />
        <path
          d={polygonPath(selPoints)}
          fill={selectedColor}
          opacity="0.25"
          stroke={selectedColor}
          strokeWidth="2"
        />
        <circle cx={cx} cy={cy} r="2" fill={COLORS.text} opacity="0.6" />
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12 }}>
        <LegendSwatch color={selectedColor} label="Cluster avg" />
        <LegendSwatch color={COLORS.text} label="Overall avg" muted />
      </div>
    </div>
  );
}

/* -------------------- Price Line over Ranges (smoothed + shaded area) -------------------- */

function PriceLineOverRanges({ COLORS, series }) {
  const w = 560,
    h = 300,
    pad = 36;

  const xs = series.map((d) => d.x);
  const ys = series.map((d) => d.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = 0,
    maxY = Math.max(1, Math.max(...ys));

  const mapX = (x) => pad + ((x - minX) / (maxX - minX)) * (w - pad * 2);
  const mapY = (y) => h - pad - ((y - minY) / (maxY - minY)) * (h - pad * 2);

  // Build smooth curve path (cubic Bézier)
  const lineD = series
    .map((d, i, arr) => {
      const x = mapX(d.x);
      const y = mapY(d.y);
      if (i === 0) return `M${x},${y}`;
      const prev = arr[i - 1];
      const prevX = mapX(prev.x);
      const prevY = mapY(prev.y);
      const midX = (prevX + x) / 2;
      return `C${midX},${prevY} ${midX},${y} ${x},${y}`;
    })
    .join(" ");

  // Area under curve down to baseline (minY)
  const y0 = mapY(minY);
  const firstX = mapX(series[0].x);
  const lastX = mapX(series[series.length - 1].x);

  const areaD =
    `M${firstX},${y0} ` + lineD.replace(/^M/, "L") + ` L${lastX},${y0} Z`;

  const strokeColor = "#FF5432";
  const fillColor = "#FF5432";

  return (
    <div
      style={{
        background: COLORS.panel,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ color: COLORS.muted, marginBottom: 8 }}>
        Transaction Price
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img">
        {/* Axes */}
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke={COLORS.border}
        />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={COLORS.border} />

        {/* X-axis ticks */}
        {series.map((d, i) => (
          <g key={`xt-${i}`}>
            <line
              x1={mapX(d.x)}
              y1={h - pad}
              x2={mapX(d.x)}
              y2={h - pad + 4}
              stroke={COLORS.border}
            />
            <text
              x={mapX(d.x)}
              y={h - pad + 16}
              fontSize="9"
              textAnchor="middle"
              fill={COLORS.muted}
            >
              ${d.binLabel}
            </text>
          </g>
        ))}

        {/* Y-axis ticks */}
        {Array.from({ length: 4 }).map((_, i) => {
          const t = i / 3;
          const yv = minY + t * (maxY - minY);
          const y = mapY(yv);
          return (
            <g key={`yt-${i}`}>
              <line
                x1={pad - 4}
                y1={y}
                x2={pad}
                y2={y}
                stroke={COLORS.border}
              />
              <text
                x={pad - 8}
                y={y + 3}
                fontSize="9"
                textAnchor="end"
                fill={COLORS.muted}
              >
                {Math.round(yv)}
              </text>
            </g>
          );
        })}

        {/* Shaded area under curve */}
        <path d={areaD} fill={fillColor} opacity="0.12" />

        {/* Smoothed line */}
        <path
          d={lineD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: COLORS.muted,
          fontSize: 11,
          marginTop: 8,
        }}
      ></div>
    </div>
  );
}

/* -------------------- Linear Algebra Helpers -------------------- */

// Matrix transpose
function transpose(mat) {
  const R = mat.length,
    C = mat[0]?.length || 0;
  const out = Array.from({ length: C }, () => Array(R));
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) out[j][i] = mat[i][j];
  }
  return out;
}

// Matrix multiply (A: R×K, B: K×C)
function mulMat(A, B) {
  const R = A.length,
    K = A[0].length,
    C = B[0].length;
  const out = Array.from({ length: R }, () => Array(C).fill(0));
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      let sum = 0;
      for (let k = 0; k < K; k++) sum += A[i][k] * B[k][j];
      out[i][j] = sum;
    }
  }
  return out;
}

// Compute top-2 eigenpairs of a symmetric matrix using power iteration
function top2Eigen(M) {
  const n = M.length;
  function norm(v) {
    const s = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    return s ? v.map((x) => x / s) : v;
  }
  function dot(a, b) {
    return a.reduce((s, x, i) => s + x * b[i], 0);
  }
  function mulMatVec(M, v) {
    return M.map((row) => dot(row, v));
  }

  const eigVecs = [];
  const eigVals = [];

  let v = norm(Array.from({ length: n }, () => Math.random() - 0.5));
  for (let it = 0; it < 100; it++) v = norm(mulMatVec(M, v));
  const Av = mulMatVec(M, v);
  let λ = dot(v, Av);
  eigVecs.push(v);
  eigVals.push(λ);

  // Deflate
  const M2 = M.map((row, i) => row.map((x, j) => x - λ * v[i] * v[j]));
  let u = norm(Array.from({ length: n }, () => Math.random() - 0.5));
  for (let it = 0; it < 100; it++) u = norm(mulMatVec(M2, u));
  const Au = mulMatVec(M2, u);
  let μ = dot(u, Au);
  eigVecs.push(u);
  eigVals.push(μ);

  return { eigVecs: transpose(eigVecs), eigVals };
}

/* -------------------- Perception Map -------------------- */
function PerceptionMap({ COLORS, data }) {
  // Long-form rows: { model: "Rivian R1S", attribute: "Adventure", value: 12 }
  const w = 560,
    h = 300; // match PriceLineOverRanges height
  const pad = 36;

  const isDarkHex = (hex) => {
    const h = hex?.replace("#", "");
    if (!h || (h.length !== 6 && h.length !== 3)) return false;
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return brightness < 0.5;
  };
  const dark = isDarkHex(COLORS.panel);

  // --- Guard: need >= 2 models and >= 2 attributes ---
  const models = Array.from(new Set((data || []).map((d) => d.model)));
  const attrs = Array.from(new Set((data || []).map((d) => d.attribute)));

  if (!data || models.length < 2 || attrs.length < 2) {
    return (
      <div
        style={{
          background: COLORS.panel,
          color: COLORS.text,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: h, // fixed to align with neighbor
        }}
      >
        <div style={{ color: COLORS.muted, fontWeight: 600 }}>
          Select at least 2 models and 2 attributes to display
        </div>
      </div>
    );
  }

  // --- Build Model x Attribute matrix ---
  const rIndex = new Map(models.map((m, i) => [m, i]));
  const cIndex = new Map(attrs.map((a, j) => [a, j]));
  const R = models.length,
    C = attrs.length;

  const M = Array.from({ length: R }, () => Array(C).fill(0));
  for (const row of data) {
    const i = rIndex.get(row.model);
    const j = cIndex.get(row.attribute);
    if (i != null && j != null) M[i][j] += Number(row.value) || 0;
  }

  // --- Correspondence Analysis (top 2 dims) ---
  const total = M.flat().reduce((s, v) => s + v, 0) || 1;
  const P = M.map((row) => row.map((v) => v / total));
  const rMass = P.map((row) => row.reduce((s, v) => s + v, 0));
  const cMass = Array.from({ length: C }, (_, j) =>
    P.reduce((s, row) => s + row[j], 0)
  );

  // Centered & standardized residuals Z
  const Z = Array.from({ length: R }, () => Array(C).fill(0));
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      const denom = Math.sqrt((rMass[i] || 1e-12) * (cMass[j] || 1e-12));
      Z[i][j] = (P[i][j] - rMass[i] * cMass[j]) / (denom || 1e-12);
    }
  }

  // Compute V (C×2) and singular values via eigen(Z'Z). Then U = Z V Σ^{-1}
  const ZtZ = mulMat(transpose(Z), Z); // C×C
  const { eigVecs: V2, eigVals: s2 } = top2Eigen(ZtZ); // V2 is C×2
  const singVals = s2.map((x) => Math.sqrt(Math.max(0, x))); // Σ

  // U = Z V Σ^{-1}  (R×2)
  const Uapprox = mulMat(Z, V2);
  const U = Uapprox.map((row) =>
    row.map((v, k) => (singVals[k] > 1e-12 ? v / singVals[k] : 0))
  );

  // Row coords F = Dr^{-1/2} U Σ   (R×2)
  const F = U.map((row, i) =>
    row.map((v, k) => (singVals[k] * v) / Math.sqrt(rMass[i] || 1e-12))
  );

  // Fixed orientation: Col coords G = Dc^{-1/2} V Σ  (C×2)
  const Grows = V2.map((row, j) => [
    (singVals[0] * row[0]) / Math.sqrt(cMass[j] || 1e-12),
    (singVals[1] * row[1]) / Math.sqrt(cMass[j] || 1e-12),
  ]);

  // Extract dims
  const rowsXY = F.map(([x, y], i) => ({ x, y, label: models[i] }));
  const colsXY = Grows.map(([x, y], j) => ({ x, y, label: attrs[j] }));

  // Inflate if everything is at ~0,0
  const allX = rowsXY.map((d) => d.x).concat(colsXY.map((d) => d.x));
  const allY = rowsXY.map((d) => d.y).concat(colsXY.map((d) => d.y));
  const sx = Math.max(1e-6, Math.max(...allX.map(Math.abs)));
  const sy = Math.max(1e-6, Math.max(...allY.map(Math.abs)));
  const inflate = sx < 1e-3 && sy < 1e-3 ? 50 : 1;
  if (inflate !== 1) {
    rowsXY.forEach((d) => {
      d.x *= inflate;
      d.y *= inflate;
    });
    colsXY.forEach((d) => {
      d.x *= inflate;
      d.y *= inflate;
    });
  }

  // For each attribute, link to 3 closest models
  const links = [];
  for (const a of colsXY) {
    const sorted = rowsXY
      .map((m) => ({ m, d: Math.hypot(m.x - a.x, m.y - a.y) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, 3);
    for (const { m } of sorted)
      links.push({ x1: m.x, y1: m.y, x2: a.x, y2: a.y });
  }

  // Axis limits + tighter padding for fuller use of space
  const xs = rowsXY.map((d) => d.x).concat(colsXY.map((d) => d.x));
  const ys = rowsXY.map((d) => d.y).concat(colsXY.map((d) => d.y));
  let xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  let yMin = Math.min(...ys),
    yMax = Math.max(...ys);

  const padFrac = 0.05;
  const xPad = (xMax - xMin || 1) * padFrac;
  const yPad = (yMax - yMin || 1) * padFrac;
  xMin -= xPad;
  xMax += xPad;
  yMin -= yPad;
  yMax += yPad;

  const eps = 1e-6;
  if (Math.abs(xMax - xMin) < eps) {
    xMin -= 0.5;
    xMax += 0.5;
  }
  if (Math.abs(yMax - yMin) < eps) {
    yMin -= 0.5;
    yMax += 0.5;
  }

  const innerPad = 18; // tight internal padding
  const offset = (Math.max(Math.abs(yMin), Math.abs(yMax)) || 1) * 0.04;

  const mapX = (x) =>
    innerPad + ((x - xMin) / (xMax - xMin || 1)) * (w - innerPad * 2);
  const mapY = (y) =>
    h - innerPad - ((y - yMin) / (yMax - yMin || 1)) * (h - innerPad * 2);

  const axisColor = dark ? "rgba(255,255,255,0.35)" : "#11232F";
  const modelColor = dark ? "#EAEAEA" : "#0b1220";
  const attrColor = "#FF5432";

  return (
    <div
      style={{
        background: COLORS.panel,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 12,
        // No minHeight/height/flex here — lets the grid define the height
      }}
    >
      <div style={{ color: COLORS.muted, marginBottom: 8 }}>
        Perception Map (Correspondence Analysis)
      </div>

      <svg
        width="100%"
        height={h} // fixed height to align with neighbor
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet" // uniform scaling
        role="img"
        style={{ display: "block" }}
      >
        {/* Axes at origin */}
        <line
          x1={mapX(0)}
          y1={innerPad}
          x2={mapX(0)}
          y2={h - innerPad}
          stroke={axisColor}
        />
        <line
          x1={innerPad}
          y1={mapY(0)}
          x2={w - innerPad}
          y2={mapY(0)}
          stroke={axisColor}
        />

        {/* Links (only closest 3) */}
        {links.map((ln, i) => (
          <line
            key={`ln-${i}`}
            x1={mapX(ln.x1)}
            y1={mapY(ln.y1)}
            x2={mapX(ln.x2)}
            y2={mapY(ln.y2)}
            stroke={dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)"}
            strokeWidth="1"
            opacity="0.7"
          />
        ))}

        {/* Model points + labels */}
        {rowsXY.map((d, i) => (
          <g key={`m-${i}`}>
            <circle cx={mapX(d.x)} cy={mapY(d.y)} r="4" fill={modelColor} />
            <text
              x={mapX(d.x)}
              y={mapY(d.y - offset)}
              fontSize="11"
              textAnchor="middle"
              fill={COLORS.text}
              style={{ fontWeight: 700 }}
            >
              {d.label}
            </text>
          </g>
        ))}

        {/* Attribute points + labels */}
        {colsXY.map((d, i) => (
          <g key={`a-${i}`}>
            <circle cx={mapX(d.x)} cy={mapY(d.y)} r="4" fill={attrColor} />
            <text
              x={mapX(d.x)}
              y={mapY(d.y - offset)}
              fontSize="11"
              textAnchor="middle"
              fill={attrColor}
              style={{ fontWeight: 700 }}
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* -------------------- US Bubble Map (simple) -------------------- */

function USBubbleMap({ COLORS, bubbles }) {
  // Simple equirectangular-ish projection into a fixed box (not a drawn basemap).
  const w = 940,
    h = 420,
    pad = 24;

  // Approx lower48 bounds: lon ~ [-125, -66], lat ~ [25, 49]
  const lonMin = -125,
    lonMax = -66;
  const latMin = 25,
    latMax = 49;

  const projX = (lon) =>
    pad + ((lon - lonMin) / (lonMax - lonMin)) * (w - pad * 2);
  const projY = (lat) =>
    pad + (1 - (lat - latMin) / (latMax - latMin)) * (h - pad * 2);

  // sizing
  const pops = bubbles.map((b) => b.pop);
  const minR = 4,
    maxR = 24;
  const minPop = Math.min(...pops),
    maxPop = Math.max(...pops);
  const scaleR = (v) =>
    minPop === maxPop
      ? (minR + maxR) / 2
      : minR + ((v - minPop) / (maxPop - minPop)) * (maxR - minR);

  // Basemap styling
  const landFill = COLORS.text; // reuse text color w/ low opacity for a subtle land tone
  const gridStroke = COLORS.border;

  return (
    <div
      style={{
        background: COLORS.panel,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ color: COLORS.muted, marginBottom: 8 }}>
        US Bubble Map — sample distribution
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img">
        {/* Land panel */}
        <rect
          x={pad}
          y={pad}
          width={w - pad * 2}
          height={h - pad * 2}
          fill={landFill}
          fillOpacity="0.05"
          stroke={gridStroke}
        />

        {/* Graticule */}
        {Array.from({ length: 6 }).map((_, i) => {
          const t = i / 5;
          const x = pad + t * (w - pad * 2);
          return (
            <line
              key={`lon-${i}`}
              x1={x}
              y1={pad}
              x2={x}
              y2={h - pad}
              stroke={gridStroke}
              opacity="0.4"
              strokeDasharray="2 4"
            />
          );
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const t = i / 5;
          const y = pad + t * (h - pad * 2);
          return (
            <line
              key={`lat-${i}`}
              x1={pad}
              y1={y}
              x2={w - pad}
              y2={y}
              stroke={gridStroke}
              opacity="0.4"
              strokeDasharray="2 4"
            />
          );
        })}

        {/* Bubbles */}
        {bubbles.map((b, i) => (
          <g key={i}>
            <circle
              cx={projX(b.lon)}
              cy={projY(b.lat)}
              r={scaleR(b.pop)}
              fill="#0CA5E1"
              opacity="0.35"
              stroke="#0CA5E1"
              strokeWidth="1"
            />
            <text
              x={projX(b.lon)}
              y={projY(b.lat) - scaleR(b.pop) - 6}
              fontSize="11"
              textAnchor="middle"
              fill={COLORS.text}
            >
              {b.city}
            </text>
          </g>
        ))}
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: COLORS.muted,
          fontSize: 11,
          marginTop: 8,
        }}
      ></div>
    </div>
  );
}

/* -------------------- Shared bits -------------------- */

function LegendSwatch({ color, label, muted }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: muted ? "#A7B1B6" : "inherit",
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          background: color,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

/* -------------------- Data generation & math -------------------- */

function makeCustomers(k, noise) {
  const N = 800; // total customers
  // centers
  const baseCenters = [
    {
      price_sensitivity: 70,
      loyalty: 30,
      engagement: 45,
      spend: 250,
      support: 6,
      nps: 20,
    },
    {
      price_sensitivity: 35,
      loyalty: 60,
      engagement: 65,
      spend: 520,
      support: 3,
      nps: 45,
    },
    {
      price_sensitivity: 20,
      loyalty: 80,
      engagement: 85,
      spend: 900,
      support: 1,
      nps: 70,
    },
    {
      price_sensitivity: 55,
      loyalty: 45,
      engagement: 30,
      spend: 300,
      support: 5,
      nps: 10,
    },
    {
      price_sensitivity: 85,
      loyalty: 20,
      engagement: 70,
      spend: 420,
      support: 8,
      nps: -5,
    },
  ];

  const centers = baseCenters.slice(0, k).map((c, i) => ({ ...c, id: i }));

  const customers = [];
  for (let i = 0; i < N; i++) {
    const cluster = i % k;
    const c = centers[cluster];
    const jitter = (m, scale = 1) =>
      clamp01(m + (randn() * 15 + randn() * 5) * noise * scale);
    const spendJ = Math.max(
      20,
      c.spend + (randn() * 180 + randn() * 60) * noise
    );
    const engagement = clamp(0, 100, c.engagement + randn() * 12 * noise);
    const nps = clamp(-100, 100, c.nps + randn() * 18 * noise);

    customers.push({
      id: i + 1,
      cluster,
      price_sensitivity: jitter(c.price_sensitivity),
      loyalty: jitter(c.loyalty),
      engagement,
      spend: spendJ,
      support: clamp(0, 10, c.support + randn() * 2 * noise),
      nps,
    });
  }

  return { customers, centers };
}

function summarize(rows) {
  const size = rows.length;
  const sums = {};
  const mins = {};
  const maxs = {};
  for (const key of [
    "price_sensitivity",
    "loyalty",
    "engagement",
    "spend",
    "support",
    "nps",
  ]) {
    sums[key] = 0;
    mins[key] = Infinity;
    maxs[key] = -Infinity;
  }
  for (const r of rows) {
    for (const key in sums) {
      const v = r[key];
      sums[key] += v;
      if (v < mins[key]) mins[key] = v;
      if (v > maxs[key]) maxs[key] = v;
    }
  }
  const avg = {};
  for (const key in sums) avg[key] = size ? sums[key] / size : 0;
  const min = mins;
  const max = maxs;
  return { size, avg, min, max };
}

/* ---- Row 2 helpers ---- */

function buildPriceBins(customers) {
  // Bin spend into $0–1000 by $100, return midpoints + counts
  const binSize = 100;
  const bins = [];
  for (let start = 0; start <= 900; start += binSize) {
    const end = start + binSize;
    const mid = start + binSize / 2;
    const count = customers.filter(
      (c) => c.spend >= start && c.spend < end
    ).length;
    bins.push({ binLabel: `${start}-${end}`, x: mid, y: count });
  }
  // Add 1000+ tail
  const tail = customers.filter((c) => c.spend >= 1000).length;
  bins.push({ binLabel: "1000+", x: 1050, y: tail });
  return bins;
}

function makePerceptionPoints() {
  // Demo perception dots
  return [
    { label: "Value-Seeking", x: 30, y: 40, color: "#22C55E" },
    { label: "Tech-forward", x: 70, y: 65, color: "#0CA5E1" },
    { label: "Adventure", x: 60, y: 30, color: "#FF5432" },
    { label: "Luxury", x: 75, y: 85, color: "#8B5CF6" },
    { label: "Practical", x: 40, y: 70, color: "#F59E0B" },
  ];
}

/* ---- Row 3 helpers ---- */

function makeUSBubbleData() {
  // A few sample cities (lat, lon) and demo populations
  return [
    { city: "Seattle", lat: 47.61, lon: -122.33, pop: 750_000 },
    { city: "SF Bay", lat: 37.77, lon: -122.42, pop: 1_500_000 },
    { city: "LA", lat: 34.05, lon: -118.24, pop: 3_800_000 },
    { city: "Denver", lat: 39.74, lon: -104.99, pop: 715_000 },
    { city: "Dallas", lat: 32.78, lon: -96.8, pop: 1_300_000 },
    { city: "Chicago", lat: 41.88, lon: -87.63, pop: 2_700_000 },
    { city: "Atlanta", lat: 33.75, lon: -84.39, pop: 500_000 },
    { city: "Miami", lat: 25.76, lon: -80.19, pop: 440_000 },
    { city: "NYC", lat: 40.71, lon: -74.01, pop: 8_500_000 },
    { city: "DC", lat: 38.91, lon: -77.04, pop: 700_000 },
  ];
}

/* -------------------- Small helpers -------------------- */

function formatK(v) {
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v.toFixed(0);
}
function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}
function polar(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}
function polygonPath(points) {
  if (!points.length) return "";
  return (
    points.map((p, i) => (i ? `L${p.x},${p.y}` : `M${p.x},${p.y}`)).join(" ") +
    "Z"
  );
}
function clamp01(v) {
  return Math.max(0, Math.min(100, v));
}
function clamp(lo, hi, v) {
  return Math.max(lo, Math.min(hi, v));
}
function randn() {
  // Box–Muller
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

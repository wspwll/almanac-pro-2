// src/pages/MarketSimulation.jsx
import React, { useMemo, useState } from "react";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

/**
 * Market Simulation (Segments / Powertrains) — Unified
 * - Both modes now have:
 *    • Range-aware KPIs
 *    • Date range selectors + Reset range + Clear selection
 *    • Line chart with hover + click-to-select month
 *    • Future beyond cutoff rendered with dashed bridge
 *    • Cards that use range averages when no month is selected,
 *      or snapshot for the selected month when it is
 * - State persists per-mode while you switch tabs. Your selections,
 *   inputs, and date range remain until you refresh or leave the page.
 */

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

function getKeyColor(label) {
  return SUV_COLORS[label] || PICKUP_COLORS[label] || PT_COLORS[label] || null;
}

export default function MarketSimulation({ COLORS, useStyles }) {
  const styles = useStyles(COLORS);

  const optionStyle = { background: COLORS.panel, color: COLORS.text };

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

  /* -------------------- Definitions -------------------- */

  const PICKUP_BLUE = "#60B6FF";
  const suvAccent = COLORS.accent;

  const DEFAULT_SELECTED = {
    segments: ["M SUV", "L Pickup"],
    powertrains: ["ICE", "HEV", "PHEV", "BEV"],
  };

  const MODES = {
    segments: {
      label: "Segments",
      keys: [
        "S SUV",
        "M SUV",
        "L SUV",
        "XL SUV",
        "S Pickup",
        "M Pickup",
        "L Pickup",
        "XL Pickup",
      ],
      baselines: {
        "S SUV": basePack(38_000, 10_000, 14, 50, 750, 6, 24_000),
        "M SUV": basePack(45_000, 12_000, 16, 55, 1_000, 6, 40_000),
        "L SUV": basePack(54_000, 14_000, 18, 60, 1_500, 6, 28_000),
        "XL SUV": basePack(62_000, 16_000, 20, 65, 2_000, 6, 16_000),
        "S Pickup": basePack(42_000, 11_000, 13, 55, 700, 6, 20_000),
        "M Pickup": basePack(50_000, 13_000, 15, 60, 1_100, 6, 36_000),
        "L Pickup": basePack(58_000, 15_000, 17, 65, 1_600, 6, 26_000),
        "XL Pickup": basePack(66_000, 17_000, 19, 70, 2_200, 6, 14_000),
      },
    },
    powertrains: {
      label: "Powertrains",
      keys: ["ICE", "HEV", "PHEV", "BEV"],
      baselines: {
        ICE: basePack(40_000, 9_000, 15, 55, 750, 6, 70_000),
        HEV: basePack(44_000, 12_000, 17, 50, 1_000, 6, 28_000),
        PHEV: basePack(50_000, 15_000, 18, 60, 1_500, 6, 14_000),
        BEV: basePack(48_000, 10_000, 20, 65, 2_500, 6, 18_000),
      },
    },
  };

  const COEFFS = {
    E_PRICE: -1.1,
    B_FLEET_PER10PP: 0.06,
    B_LEASE_PER10PP: 0.04,
    B_INCENTIVES_PER_K: 0.05,
    B_DAYS_PER10: -0.05,
  };

  function basePack(
    atp,
    fleetPct,
    leasePct,
    days,
    incentives,
    monthNum,
    baseVol
  ) {
    return {
      price: atp,
      fleet: fleetPct,
      lease: leasePct,
      days,
      incentives,
      month: monthNum,
      base_volume: baseVol,
    };
  }

  /* -------------------- Shared time axis -------------------- */

  const HIST_START_YM = "2023-01";
  const FUTURE_CUTOFF_YM = "2025-08";

  const monthTicks = useMemo(() => makeMonthRange("2023-01", "2040-01"), []);
  const futureCutoffIdx = useMemo(
    () => monthTicks.indexOf(FUTURE_CUTOFF_YM),
    [monthTicks]
  );
  const DEFAULT_RANGE_START = useMemo(() => {
    const i = monthTicks.indexOf(HIST_START_YM);
    return i >= 0 ? i : 0;
  }, [monthTicks]);
  const DEFAULT_RANGE_END = useMemo(() => {
    const i = monthTicks.indexOf(FUTURE_CUTOFF_YM);
    return i >= 0 ? i : monthTicks.length - 1;
  }, [monthTicks]);

  /* -------------------- Profiles for BOTH modes -------------------- */

  const profilesByMode = useMemo(() => {
    const out = {};
    ["segments", "powertrains"].forEach((m) => {
      const profileByKey = {};
      const keys = MODES[m].keys;
      for (const key of keys) {
        const base = MODES[m].baselines[key];
        profileByKey[key] = buildDummyProfileForKey(
          key,
          base,
          monthTicks.length
        );
      }
      out[m] = { monthTicks, profileByKey };
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthTicks]);

  /* -------------------- PERSISTENT PER-MODE STATE -------------------- */

  const [mode, setMode] = useState("segments");
  const [stateByMode, setStateByMode] = useState(() => ({
    segments: {
      selected: DEFAULT_SELECTED.segments,
      edits: {},
      selectedMonthIdx: null,
      rangeStartIdx: null,
      rangeEndIdx: null,
      applyScope: "month", // ← NEW: 'month' | 'year'
    },
    powertrains: {
      selected: DEFAULT_SELECTED.powertrains,
      edits: {},
      selectedMonthIdx: null,
      rangeStartIdx: null,
      rangeEndIdx: null,
      applyScope: "month", // ← NEW: 'month' | 'year'
    },
  }));

  // After monthTicks known, assign defaults only where null
  React.useEffect(() => {
    setStateByMode((prev) => ({
      segments: {
        ...prev.segments,
        rangeStartIdx: prev.segments.rangeStartIdx ?? DEFAULT_RANGE_START,
        rangeEndIdx: prev.segments.rangeEndIdx ?? DEFAULT_RANGE_END,
      },
      powertrains: {
        ...prev.powertrains,
        rangeStartIdx: prev.powertrains.rangeStartIdx ?? DEFAULT_RANGE_START,
        rangeEndIdx: prev.powertrains.rangeEndIdx ?? DEFAULT_RANGE_END,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEFAULT_RANGE_START, DEFAULT_RANGE_END]);

  function switchMode(nextMode) {
    setMode(nextMode); // keep per-mode state intact
  }

  // Convenience getters/setters scoped to active mode
  const view = stateByMode[mode];
  const {
    selected,
    edits,
    selectedMonthIdx,
    rangeStartIdx,
    rangeEndIdx,
    applyScope,
  } = view;

  const defs = MODES[mode];
  const activeProfiles = profilesByMode[mode];

  function updateView(patch) {
    setStateByMode((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], ...patch },
    }));
  }
  function updateViewField(field, value) {
    setStateByMode((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [field]: value },
    }));
  }

  function getRangeBounds() {
    const rs = Math.max(
      0,
      Math.min(rangeStartIdx ?? DEFAULT_RANGE_START, monthTicks.length - 1)
    );
    const re = Math.max(
      rs,
      Math.min(rangeEndIdx ?? DEFAULT_RANGE_END, monthTicks.length - 1)
    );
    return [rs, re];
  }

  function rangeStatsForKey(key, rs, re) {
    const prof = activeProfiles.profileByKey[key];
    if (!prof) {
      return {
        avgPrice: 0,
        avgFleet: 0,
        avgLease: 0,
        avgDays: 0,
        avgIncentives: 0,
        totalVolume: 0,
      };
    }

    let sumVol = 0,
      sumPriceVol = 0,
      sumFleetVol = 0,
      sumLeaseVol = 0,
      sumDaysVol = 0,
      sumIncVol = 0;

    for (let i = rs; i <= re; i++) {
      const v = prof.volume[i]?.v ?? 0;
      sumVol += v;
      sumPriceVol += (prof.price[i] ?? 0) * v;
      sumFleetVol += (prof.fleet[i] ?? 0) * v;
      sumLeaseVol += (prof.lease[i] ?? 0) * v;
      sumDaysVol += (prof.days[i] ?? 0) * v;
      sumIncVol += (prof.incentives[i] ?? 0) * v;
    }

    const vw = (s) => (sumVol > 0 ? s / sumVol : 0);

    return {
      avgPrice: Math.round(vw(sumPriceVol)),
      avgFleet: Math.round(vw(sumFleetVol)),
      avgLease: Math.round(vw(sumLeaseVol)),
      avgDays: Math.round(vw(sumDaysVol)),
      avgIncentives: Math.round(vw(sumIncVol)),
      totalVolume: Math.round(sumVol),
    };
  }

  function clearSelectedMonthToRange() {
    const [rs, re] = getRangeBounds();
    const newEdits = { ...edits };
    for (const key of selected) {
      const stats = rangeStatsForKey(key, rs, re);
      newEdits[key] = {
        ...(newEdits[key] || {}),
        price: stats.avgPrice,
        fleet: stats.avgFleet,
        lease: stats.avgLease,
        days: stats.avgDays,
        incentives: stats.avgIncentives,
      };
    }
    updateView({ edits: newEdits, selectedMonthIdx: null });
  }

  /* -------------------- Derived rows -------------------- */

  const rows = useMemo(() => {
    const [rs, re] = getRangeBounds();

    return selected.map((key) => {
      const b = defs.baselines[key];
      if (selectedMonthIdx != null) {
        const s = { ...b, ...(edits[key] || {}) };
        const vol = computeVolume(s, b, COEFFS);
        return { key, label: key, ...s, volume: vol };
      }
      const stats = rangeStatsForKey(key, rs, re);
      const e = edits[key] || {};
      const s = {
        ...b,
        price: e.price ?? stats.avgPrice,
        fleet: e.fleet ?? stats.avgFleet,
        lease: e.lease ?? stats.avgLease,
        days: e.days ?? stats.avgDays,
        incentives: e.incentives ?? stats.avgIncentives,
      };
      return { key, label: key, ...s, volume: stats.totalVolume };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected, edits, selectedMonthIdx, rangeStartIdx, rangeEndIdx]);

  /* -------------------- KPIs -------------------- */

  const kpis = useMemo(() => {
    const [rs, re] = getRangeBounds();
    const keys = selected;

    let sumVol = 0;
    let sumPriceVol = 0;
    let sumFleetVol = 0;
    let sumLeaseVol = 0;
    let sumDaysVol = 0;
    let sumIncVol = 0;

    for (const key of keys) {
      const prof = activeProfiles.profileByKey[key];
      if (!prof) continue;

      for (let i = rs; i <= re; i++) {
        const v = prof.volume[i]?.v ?? 0;
        const p = prof.price[i] ?? 0;
        const fleet = prof.fleet[i] ?? 0;
        const lease = prof.lease[i] ?? 0;
        const days = prof.days[i] ?? 0;
        const inc = prof.incentives[i] ?? 0;

        sumVol += v;
        sumPriceVol += p * v;
        sumFleetVol += fleet * v;
        sumLeaseVol += lease * v;
        sumDaysVol += days * v;
        sumIncVol += inc * v;
      }
    }

    const volWeighted = (sum) => (sumVol > 0 ? sum / sumVol : 0);

    return {
      totalVolume: sumVol,
      weightedATP: volWeighted(sumPriceVol),
      fleetMix: volWeighted(sumFleetVol),
      leaseMix: volWeighted(sumLeaseVol),
      daysSupply: volWeighted(sumDaysVol),
      incentives: volWeighted(sumIncVol),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected, rangeStartIdx, rangeEndIdx, activeProfiles]);

  /* -------------------- Apply month selection -------------------- */

  function applyMonthToInputs(idx) {
    const newEdits = { ...edits };
    for (const key of selected) {
      const prof = activeProfiles.profileByKey[key];
      if (!prof) continue;
      const i = Math.max(0, Math.min(idx, monthTicks.length - 1));
      const mNum = ymToMonthNumber(monthTicks[i]);
      newEdits[key] = {
        ...(newEdits[key] || {}),
        price: Math.round(prof.price[i]),
        fleet: Math.round(prof.fleet[i]),
        lease: Math.round(prof.lease[i]),
        days: Math.round(prof.days[i]),
        incentives: Math.round(prof.incentives[i]),
        month: mNum,
      };
    }
    updateView({ edits: newEdits, selectedMonthIdx: idx });
  }

  /* -------------------- Handlers -------------------- */

  function toggleSelection(key) {
    const nextSel = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    updateViewField("selected", nextSel);
  }

  function handleChange(key, field, raw) {
    const value = toNumberSafe(raw);
    const newEdits = { ...(edits || {}) };
    const next = { ...(newEdits[key] || {}) };
    if (field === "month") next.month = clamp(Math.round(value), 1, 12);
    else if (field === "price") next.price = clamp(value, 1000, 250000);
    else if (field === "fleet") next.fleet = clamp(value, 0, 100000);
    else if (field === "lease") next.lease = clamp(value, 0, 100000);
    else if (field === "days") next.days = clamp(value, 0, 400);
    else if (field === "incentives") next.incentives = clamp(value, 0, 25000);
    newEdits[key] = next;
    updateViewField("edits", newEdits);
  }

  function resetCard(key) {
    const newEdits = { ...(edits || {}) };
    delete newEdits[key];
    updateViewField("edits", newEdits);
  }

  function resetAllCards() {
    updateViewField("edits", {}); // clear all manual input overrides
    updateViewField("selectedMonthIdx", null); // optional: also clear month selection
  }

  /* -------------------- Styles -------------------- */

  const card = {
    background: COLORS.panel,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 16,
    boxSizing: "border-box",
  };

  const topWrap = {
    ...card,
    background: "transparent",
    border: "none",
    padding: 18,
    display: "grid",
    gap: 10,
  };

  // --- Neutral tokens for mode toggle (no brand hue) ---
  const isDark = isDarkHex(COLORS.panel);
  const TOGGLE_ACTIVE_BORDER = isDark ? "#FFFFFF" : "#11232F"; // dark: white, light: Scout deep navy
  const TOGGLE_ACTIVE_BG = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(17,35,47,0.10)";
  const TOGGLE_IDLE_BORDER = COLORS.border;
  const TOGGLE_TEXT = COLORS.text;

  const label = { color: "#FFFFF", fontSize: 12 };
  const inputRow = {
    display: "grid",
    gridTemplateColumns: "1fr 110px",
    gap: 8,
    alignItems: "center",
  };
  const number = {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: COLORS.text,
    fontFamily: "inherit",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const kpiGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(160px, 1fr))",
    gap: 12,
  };
  const kpiCard = {
    background: "transparent",
    border: "none",
    borderRadius: 12,
    padding: 12,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

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

  const chip = (active) => {
    const accent = suvAccent;
    return {
      padding: "6px 10px",
      borderRadius: 999,
      border: `1px solid ${active ? accent : COLORS.border}`,
      background: active ? `rgba(${hexToRgb(accent)}, 0.18)` : "transparent",
      color: COLORS.text,
      cursor: "pointer",
      fontSize: 13,
      transition: "border-color 120ms ease, background-color 120ms ease",
    };
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

  const sizesOrder = ["S", "M", "L", "XL"];

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
            const active = selected.includes(label);
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
            const active = selected.includes(label);
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

  /* -------------------- Render -------------------- */

  const hasAnyEdits = Object.keys(edits).length > 0;
  const selectedMonthLabel =
    selectedMonthIdx == null ? null : ymToLabel(monthTicks[selectedMonthIdx]);

  const showFutureAsDashed =
    (rangeEndIdx ?? DEFAULT_RANGE_END) > futureCutoffIdx;

  return (
    <div>
      {/* Header */}
      <div style={topWrap}>
        <h1
          style={{
            ...styles.h1,
            margin: 0,
            color: COLORS.accent,
            transition: "color 120ms ease",
          }}
        >
          Market Simulation
        </h1>

        <p
          style={{
            color: COLORS.muted,
            margin: 0,
            fontSize: 20,
            lineHeight: 1.4,
          }}
        >
          Simulate market scenarios by selecting categories and adjusting key
          drivers. Results update in real time based on your inputs and selected
          time period.
        </p>

        <div style={{ marginTop: 30, marginBottom: 2 }}>
          <div style={{ color: COLORS.muted }}>Choose category</div>
        </div>

        {(() => {
          const isDark = isDarkHex(COLORS.panel);
          const neutralAccent = isDark
            ? "#FFFFFF"
            : shiftHexLightness(COLORS.accent, -0.28); // darker accent on light panels
          const activeBg = isDark
            ? "rgba(255,255,255,0.22)"
            : `rgba(${hexToRgb(neutralAccent)}, 0.12)`;
          const activeBorder = isDark
            ? "1px solid #FFFFFF"
            : `1px solid ${neutralAccent}`;

          return (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 0,
                marginBottom: 20,
              }}
            >
              {[
                { id: "segments", label: "Segments" },
                { id: "powertrains", label: "Powertrains" },
              ].map((m) => {
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => switchMode(m.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: isActive
                        ? `1px solid ${TOGGLE_ACTIVE_BORDER}`
                        : `1px solid ${TOGGLE_IDLE_BORDER}`,
                      background: isActive ? TOGGLE_ACTIVE_BG : "transparent",
                      fontSize: 16,
                      color: TOGGLE_TEXT,
                      cursor: "pointer",
                      transition:
                        "background-color 120ms ease, border-color 120ms ease",
                    }}
                    title={m.label}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Chips */}
        <div style={{ marginTop: 6 }}>
          <div style={{ color: COLORS.muted, marginBottom: 12 }}>
            {MODES[mode].label}: choose one or more
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
              {defs.keys.map((k) => {
                const active = selected.includes(k);
                const c = getKeyColor(k) || suvAccent;
                const alpha = isDarkHex(COLORS.panel) ? 0.22 : 0.14;
                const style = {
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
                };
                return (
                  <button
                    key={k}
                    onClick={() => toggleSelection(k)}
                    style={style}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Controls above KPIs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          flexWrap: "wrap",
          marginLeft: 6,
        }}
      >
        <span style={{ color: COLORS.muted, fontSize: 12 }}>Date range:</span>

        <select
          value={rangeStartIdx ?? DEFAULT_RANGE_START}
          onChange={(e) => {
            const s = Number(e.target.value);
            const eIdx = Math.max(s, rangeEndIdx ?? DEFAULT_RANGE_END);
            updateView({ rangeStartIdx: s, rangeEndIdx: eIdx });
            if (
              selectedMonthIdx != null &&
              (selectedMonthIdx < s || selectedMonthIdx > eIdx)
            ) {
              updateViewField("selectedMonthIdx", null);
            }
          }}
          style={{
            padding: "6px 8px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.panel,
            color: COLORS.text,
            fontSize: 12,
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
          }}
        >
          {monthTicks.map((m, i) => (
            <option key={`s-${m}`} value={i} style={optionStyle}>
              {ymToLabel(m)}
            </option>
          ))}
        </select>

        <span style={{ color: COLORS.muted, fontSize: 12 }}>to</span>

        <select
          value={rangeEndIdx ?? DEFAULT_RANGE_END}
          onChange={(e) => {
            const eIdx = Number(e.target.value);
            const s = Math.min(rangeStartIdx ?? DEFAULT_RANGE_START, eIdx);
            updateView({ rangeStartIdx: s, rangeEndIdx: eIdx });
            if (
              selectedMonthIdx != null &&
              (selectedMonthIdx < s || selectedMonthIdx > eIdx)
            ) {
              updateViewField("selectedMonthIdx", null);
            }
          }}
          style={{
            padding: "6px 8px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.panel,
            color: COLORS.text,
            fontSize: 12,
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
          }}
        >
          {monthTicks.map((m, i) => (
            <option key={`e-${m}`} value={i} style={optionStyle}>
              {ymToLabel(m)}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            const s = Math.max(0, monthTicks.indexOf(HIST_START_YM));
            const e = Math.max(s, monthTicks.indexOf(FUTURE_CUTOFF_YM));
            updateView({ rangeStartIdx: s, rangeEndIdx: e });
            if (
              selectedMonthIdx != null &&
              (selectedMonthIdx < s || selectedMonthIdx > e)
            ) {
              updateViewField("selectedMonthIdx", null);
            }
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: "transparent",
            color: COLORS.muted,
            cursor: "pointer",
            fontSize: 12,
            marginLeft: 8,
          }}
        >
          Reset range
        </button>

        {selectedMonthIdx != null && (
          <button
            onClick={clearSelectedMonthToRange}
            title="Clear selected month"
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear selection
          </button>
        )}
      </div>

      {/* KPIs + Chart */}
      <div style={{ ...card, marginTop: 8 }}>
        <div style={kpiGrid}>
          <div style={kpiCard}>
            <div style={{ color: COLORS.muted, fontSize: 18 }}>
              Total Volume
            </div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>
              {fmt(kpis.totalVolume, 0)}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={{ color: COLORS.muted, fontSize: 18 }}>Price Paid</div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>
              ${fmt(kpis.weightedATP, 0)}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={{ color: COLORS.muted, fontSize: 18 }}>Fleet Mix</div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>
              {fmt(kpis.fleetMix, 1)}%
            </div>
          </div>

          <div style={kpiCard}>
            <div style={{ color: COLORS.muted, fontSize: 18 }}>Lease Mix</div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>
              {fmt(kpis.leaseMix, 1)}%
            </div>
          </div>

          <div style={kpiCard}>
            <div style={{ color: COLORS.muted, fontSize: 18 }}>
              Days' Supply
            </div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>
              {fmt(kpis.daysSupply, 0)}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={{ color: COLORS.muted, fontSize: 18 }}>Incentives</div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>
              ${fmt(kpis.incentives, 0)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <LineChartGeneric
            COLORS={COLORS}
            monthTicks={monthTicks}
            seriesByKey={activeSeriesForChart(activeProfiles)}
            selectedKeys={selected}
            selectedIndex={selectedMonthIdx}
            onSelectIndex={applyMonthToInputs}
            rangeStart={rangeStartIdx ?? DEFAULT_RANGE_START}
            rangeEnd={rangeEndIdx ?? DEFAULT_RANGE_END}
            futureCutoffIdx={futureCutoffIdx}
            showFutureAsDashed={showFutureAsDashed}
            colorForKey={(label) => colorForKey(label, suvAccent, PICKUP_BLUE)}
            isDarkPanel={isDarkHex(COLORS.panel)}
          />
        </div>
      </div>

      {/* Cards per selection */}
      <div style={{ ...card, marginTop: 12 }}>
        <div
          style={{
            color: COLORS.muted,
            marginBottom: 12,
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Selected month label (stays on the right) */}
          {selectedMonthLabel && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <strong style={{ color: COLORS.text }}>
                {selectedMonthLabel}
              </strong>
            </span>
          )}

          {/* NEW: Scope toggle — Month only vs Year avg */}
          <div
            role="group"
            aria-label="Apply changes to"
            style={{
              display: "inline-flex",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              overflow: "hidden",
              marginLeft: 6,
            }}
          >
            {/* Month only */}
            <button
              onClick={() => updateViewField("applyScope", "month")}
              style={{
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
                background:
                  applyScope === "month"
                    ? isDarkHex(COLORS.panel)
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,84,50,0.16)"
                    : "transparent",
                color: COLORS.text,
                border: "none",
                borderRight: `1px solid ${COLORS.border}`,
                transition: "background-color 120ms ease",
              }}
              title="Apply card changes only to the chosen month"
            >
              Month only
            </button>

            {/* Year avg (label shows the year of the selected month if present) */}
            <button
              onClick={() => updateViewField("applyScope", "year")}
              style={{
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
                background:
                  applyScope === "year"
                    ? isDarkHex(COLORS.panel)
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,84,50,0.16)"
                    : "transparent",
                color: COLORS.text,
                border: "none",
                transition: "background-color 120ms ease",
              }}
              title="Apply card changes as a calendar-year average"
            >
              {(() => {
                if (selectedMonthIdx == null) return "Total Year";
                const ym = monthTicks[selectedMonthIdx] || "";
                const year = ym.split("-")[0] || "";
                return `Total Year ${year}`;
              })()}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          {rows.map((r) => {
            const c =
              getKeyColor(r.label) ||
              colorForKey(r.label, suvAccent, PICKUP_BLUE);
            const alpha = isDarkHex(COLORS.panel) ? 0.1 : 0.14;

            const hasEditsForKey = !!edits[r.key];

            return (
              <div
                key={r.key}
                style={{
                  border: `1px solid ${c}`,
                  borderRadius: 12,
                  padding: 12,
                  background: `rgba(${hexToRgb(c)}, ${alpha})`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{r.label}</div>

                  {hasEditsForKey && (
                    <button
                      onClick={() => resetCard(r.key)}
                      title="Reset this card"
                      style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: `1px solid rgba(${hexToRgb(c)}, 0.55)`,
                        background: "transparent",
                        color: COLORS.text,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ color: COLORS.text, fontSize: 16 }}>Volume</div>
                  <div style={{ fontWeight: 800, fontSize: 24 }}>
                    {fmt(r.volume, 0)}
                  </div>
                </div>

                <div style={inputRow}>
                  <div>
                    <div style={label}>Avg Price Paid</div>
                  </div>
                  <input
                    type="number"
                    value={r.price}
                    onChange={(e) =>
                      handleChange(r.key, "price", e.target.value)
                    }
                    style={{
                      ...number,
                      border: `1px solid rgba(${hexToRgb(c)}, 0.55)`,
                    }}
                  />
                </div>

                <div style={{ ...inputRow, marginTop: 10 }}>
                  <div>
                    <div style={label}>Fleet Mix (%)</div>
                  </div>
                  <input
                    type="number"
                    value={r.fleet}
                    onChange={(e) =>
                      handleChange(r.key, "fleet", e.target.value)
                    }
                    style={{
                      ...number,
                      border: `1px solid rgba(${hexToRgb(c)}, 0.55)`,
                    }}
                  />
                </div>

                <div style={{ ...inputRow, marginTop: 10 }}>
                  <div>
                    <div style={label}>Lease Mix (%)</div>
                  </div>
                  <input
                    type="number"
                    value={r.lease}
                    onChange={(e) =>
                      handleChange(r.key, "lease", e.target.value)
                    }
                    style={{
                      ...number,
                      border: `1px solid rgba(${hexToRgb(c)}, 0.55)`,
                    }}
                  />
                </div>

                <div style={{ ...inputRow, marginTop: 10 }}>
                  <div>
                    <div style={label}>Days Supply</div>
                  </div>
                  <input
                    type="number"
                    value={r.days}
                    onChange={(e) =>
                      handleChange(r.key, "days", e.target.value)
                    }
                    style={{
                      ...number,
                      border: `1px solid rgba(${hexToRgb(c)}, 0.55)`,
                    }}
                  />
                </div>

                <div style={{ ...inputRow, marginTop: 10 }}>
                  <div>
                    <div style={label}>Incentives ($)</div>
                  </div>
                  <input
                    type="number"
                    value={r.incentives}
                    onChange={(e) =>
                      handleChange(r.key, "incentives", e.target.value)
                    }
                    style={{
                      ...number,
                      border: `1px solid rgba(${hexToRgb(c)}, 0.55)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}

/* -------------------- Generic Line Chart -------------------- */

function LineChartGeneric(props) {
  const {
    COLORS,
    monthTicks,
    seriesByKey,
    selectedKeys,
    selectedIndex,
    onSelectIndex,
    rangeStart,
    rangeEnd,
    futureCutoffIdx,
    showFutureAsDashed,
    colorForKey,
    isDarkPanel,
  } = props;

  const svgRef = React.useRef(null);
  const [hoverI, setHoverI] = React.useState(null);
  const [hoverXsvg, setHoverXsvg] = React.useState(null);
  const [hoverLeftCss, setHoverLeftCss] = React.useState(null);

  const w = 1080;
  const h = 300;
  const padL = 40,
    padR = 24,
    padT = 18,
    padB = 36;

  const rs = Math.max(0, Math.min(rangeStart ?? 0, monthTicks.length - 1));
  const re = Math.max(
    rs,
    Math.min(rangeEnd ?? monthTicks.length - 1, monthTicks.length - 1)
  );
  const xMax = re - rs;

  const lines = selectedKeys
    .filter((k) => seriesByKey[k])
    .map((k) => ({ key: k, values: seriesByKey[k] }));

  const globalMax = Math.max(
    1,
    ...Object.values(seriesByKey)
      .flat()
      .map((d) => d.v)
  );

  const mapX = (i) => padL + ((i - rs) / Math.max(1, xMax)) * (w - padL - padR);
  const mapY = (v) => h - padB - (v / globalMax) * (h - padT - padB);

  const tickCount = 5;
  const tickIdxs = Array.from({ length: tickCount }, (_, i) =>
    Math.round(rs + (i / (tickCount - 1)) * xMax)
  );

  const legendItems = lines.map((ln) => ({
    key: ln.key,
    color: colorForKey(ln.key),
  }));

  function clientToSvg(evt) {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }

  function handleMove(e) {
    const p = clientToSvg(e);
    if (!p) return;
    const xSvg = Math.max(padL, Math.min(w - padR, p.x));
    const t = (xSvg - padL) / (w - padL - padR);
    const i = Math.round(rs + t * xMax);
    const rect = svgRef.current.getBoundingClientRect();
    const leftCss = (xSvg / w) * rect.width;

    setHoverI(i >= rs && i <= re ? i : null);
    setHoverXsvg(i >= rs && i <= re ? xSvg : null);
    setHoverLeftCss(leftCss);
  }

  function handleLeave() {
    setHoverI(null);
    setHoverXsvg(null);
    setHoverLeftCss(null);
  }

  function handleClick() {
    if (hoverI != null && onSelectIndex) onSelectIndex(hoverI);
  }

  const tooltipData =
    hoverI == null
      ? null
      : lines
          .map((ln) => ({
            key: ln.key,
            color: colorForKey(ln.key),
            v: ln.values[hoverI]?.v ?? 0,
          }))
          .sort((a, b) => b.v - a.v);

  const hoverMonthLabel = hoverI == null ? "" : ymToLabel(monthTicks[hoverI]);

  const toPath = (points) =>
    !points.length
      ? ""
      : points.map(([x, y], i) => (i ? `L${x},${y}` : `M${x},${y}`)).join(" ");

  return (
    <div
      style={{
        borderTop: `1px dashed ${COLORS.border}`,
        paddingTop: 12,
        position: "relative",
      }}
    >
      {/* Legend */}
      {legendItems.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            marginTop: 8,
            marginBottom: 0,
            marginLeft: padL,
          }}
        >
          {legendItems.map((it) => (
            <div
              key={it.key}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: it.color,
                }}
              />
              <span style={{ fontSize: 16, color: "#FFFFF" }}>{it.key}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onClick={handleClick}
          style={{ display: "block", cursor: "crosshair" }}
        >
          {/* Future projection background */}
          {showFutureAsDashed &&
            futureCutoffIdx < re &&
            (() => {
              const shadeStartIdx = Math.max(rs, futureCutoffIdx); // ← place it HERE
              return (
                <rect
                  x={mapX(shadeStartIdx)}
                  y={padT}
                  width={Math.max(1, mapX(re) - mapX(shadeStartIdx))}
                  height={h - padT - padB}
                  fill={
                    isDarkPanel ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                  }
                />
              );
            })()}

          {/* Axes */}
          <line
            x1={padL}
            y1={h - padB}
            x2={w - padR}
            y2={h - padB}
            stroke={COLORS.border}
          />
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={h - padB}
            stroke={COLORS.border}
          />

          {/* X ticks & labels */}
          {tickIdxs.map((ti, idx) => (
            <g key={`t-${idx}`}>
              <line
                x1={mapX(ti)}
                y1={h - padB}
                x2={mapX(ti)}
                y2={h - padB + 4}
                stroke={COLORS.border}
              />
              <text
                x={mapX(ti)}
                y={h - padB + 16}
                fontSize="10"
                textAnchor="middle"
                fill={COLORS.text}
              >
                {ymToLabel(monthTicks[ti])}
              </text>
            </g>
          ))}

          {/* Lines (past solid + future dashed) */}
          {lines.map((ln) => {
            const stroke = colorForKey(ln.key);

            const pastEnd = Math.min(re, futureCutoffIdx);
            const pastPts = [];
            for (let i = rs; i <= pastEnd; i++) {
              const v = ln.values[i]?.v ?? 0;
              pastPts.push([mapX(i), mapY(v)]);
            }

            const futStart = Math.max(rs, futureCutoffIdx + 1);
            const futPts = [];
            for (let i = futStart; i <= re; i++) {
              const v = ln.values[i]?.v ?? 0;
              futPts.push([mapX(i), mapY(v)]);
            }

            let futPtsWithBridge = futPts;
            if (showFutureAsDashed && futPts.length > 0 && pastPts.length > 0) {
              const vPastEnd = ln.values[pastEnd]?.v ?? 0;
              const augPoint = [mapX(pastEnd), mapY(vPastEnd)];
              futPtsWithBridge = [augPoint, ...futPts];
            }

            return (
              <g key={ln.key}>
                {pastPts.length > 1 && (
                  <path
                    d={toPath(pastPts)}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}

                {showFutureAsDashed && futPtsWithBridge.length > 1 && (
                  <path
                    d={toPath(futPtsWithBridge)}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="2 6"
                    strokeLinecap="round"
                  />
                )}

                {!showFutureAsDashed && futPts.length > 1 && (
                  <path
                    d={toPath(futPts)}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}

          {/* Persistent selected line */}
          {selectedIndex != null &&
            selectedIndex >= rs &&
            selectedIndex <= re && (
              <line
                x1={mapX(selectedIndex)}
                x2={mapX(selectedIndex)}
                y1={padT}
                y2={h - padB}
                stroke={COLORS.text}
                opacity="0.4"
                strokeWidth="2"
              />
            )}

          {/* Hover guide + markers */}
          {hoverI != null && hoverXsvg != null && (
            <g>
              <line
                x1={hoverXsvg}
                x2={hoverXsvg}
                y1={padT}
                y2={h - padB}
                stroke={COLORS.border}
                strokeDasharray="4 4"
              />
              {lines.map((ln) => {
                const v = ln.values[hoverI]?.v ?? 0;
                return (
                  <circle
                    key={`pt-${ln.key}`}
                    cx={hoverXsvg}
                    cy={mapY(v)}
                    r="3.5"
                    fill={colorForKey(ln.key)}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hoverI != null &&
          hoverLeftCss != null &&
          tooltipData &&
          tooltipData.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: clampPx(hoverLeftCss + 12, 8, "calc(100% - 220px)"),
                top: padT + 6,
                background: COLORS.panel,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.22)",
                pointerEvents: "none",
                minWidth: 180,
                transform: "translateZ(0)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {hoverMonthLabel}
              </div>
              {tooltipData.map((row) => (
                <div
                  key={`tt-${row.key}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: row.color,
                      }}
                    />
                    <span style={{ color: COLORS.muted }}>{row.key}</span>
                  </div>
                  <div style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(row.v, 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

/* -------------------- Series builder -------------------- */

function activeSeriesForChart(activeProfiles) {
  const out = {};
  for (const [k, prof] of Object.entries(activeProfiles.profileByKey)) {
    out[k] = prof.volume.map((d, i) => ({ i, v: d.v }));
  }
  return out;
}

/* -------------------- Color helpers -------------------- */

function colorForKey(label, suvAccent, pickupBlue) {
  const explicit = getKeyColor(label);
  if (explicit) return explicit;
  const isPickup = /Pickup/i.test(label);
  const base = isPickup ? pickupBlue : suvAccent;
  const t = (hashString(label) % 40) - 20;
  return shiftHexLightness(base, t / 200);
}

/* -------------------- Dummy profile builder -------------------- */

function buildDummyProfileForKey(key, base, n) {
  const rnd = mulberry32(hashString(key));
  const season = (i, amp = 0.1) => 1 + amp * Math.sin((2 * Math.PI * i) / 12);
  const noise = (amp = 0.03) => 1 + (rnd() - 0.5) * (2 * amp);
  const trend = (i, slope = 0.0015) => 1 + slope * i;

  const price = Array.from(
    { length: n },
    (_, i) => base.price * season(i, 0.06) * trend(i, 0.0008) * noise(0.015)
  );
  const fleet = Array.from(
    { length: n },
    (_, i) => base.fleet * season(i, 0.04) * noise(0.02)
  );
  const lease = Array.from(
    { length: n },
    (_, i) => base.lease * season(i, 0.03) * noise(0.02)
  );
  const days = Array.from(
    { length: n },
    (_, i) => base.days * (2 - season(i, 0.08)) * noise(0.03)
  );
  const incentives = Array.from(
    { length: n },
    (_, i) => base.incentives * season(i, 0.12) * noise(0.05)
  );
  const volume = Array.from(
    { length: n },
    (_, i) => base.base_volume * season(i, 0.1) * trend(i, 0.002) * noise(0.04)
  ).map((v) => ({ v: Math.max(1, v) }));

  return { price, fleet, lease, days, incentives, volume };
}

/* -------------------- Shared helpers -------------------- */

function ymToLabel(ym) {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
function ymToMonthNumber(ym) {
  return parseInt(ym.split("-")[1], 10);
}
function makeMonthRange(startYM, endYM) {
  const [sY, sM] = startYM.split("-").map((n) => parseInt(n, 10));
  const [eY, eM] = endYM.split("-").map((n) => parseInt(n, 10));
  const out = [];
  let y = sY,
    m = sM;
  while (y < eY || (y === eY && m <= eM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}
function shiftHexLightness(hex, amt = 0) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  let r = parseInt(full.slice(0, 2), 16);
  let g = parseInt(full.slice(2, 4), 16);
  let b = parseInt(full.slice(4, 6), 16);
  const { h: H, s: S, l: L } = rgbToHsl(r, g, b);
  const L2 = clamp(L + amt, 0, 1);
  const { r: R, g: G, b: B } = hslToRgb(H, S, L2);
  const to2 = (x) => x.toString(16).padStart(2, "0");
  return `#${to2(R)}${to2(G)}${to2(B)}`;
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 1);
        break;
      case g:
        h = (b - r) / d + 3;
        break;
      default:
        h = (r - g) / d + 5;
    }
    h /= 6;
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return { r, g, b };
}

/* -------------------- Model -------------------- */

function computeVolume(s, base, K) {
  const priceFactor = Math.pow(s.price / base.price, K.E_PRICE);
  const fleetFactor = Math.exp(
    K.B_FLEET_PER10PP * ((s.fleet - base.fleet) / 10)
  );
  const leaseFactor = Math.exp(
    K.B_LEASE_PER10PP * ((s.lease - base.lease) / 10)
  );
  const daysFactor = Math.exp(K.B_DAYS_PER10 * ((s.days - base.days) / 10));
  const incFactor = Math.exp(
    K.B_INCENTIVES_PER_K * ((s.incentives - base.incentives) / 1000)
  );
  const vol =
    base.base_volume *
    priceFactor *
    fleetFactor *
    leaseFactor *
    daysFactor *
    incFactor;
  return Math.max(0, vol);
}

/* -------------------- Utils -------------------- */

function toNumberSafe(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
}
function fmt(v, digits = 0) {
  if (!Number.isFinite(v)) return "";
  const f = Number(v.toFixed(digits));
  return digits === 0
    ? f.toLocaleString()
    : f.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}
function clampPx(px, minPx, max) {
  if (typeof max === "number") return `${Math.max(minPx, Math.min(px, max))}px`;
  return `min(max(${px}px, ${minPx}px), ${max})`;
}

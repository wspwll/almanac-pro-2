// src/pages/LegalNotice.jsx
import React from "react";

export default function LegalNotice({ COLORS, useStyles }) {
  const styles = useStyles(COLORS);

  // Pick signature by theme (based on panel brightness)
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

  const card = {
    background: COLORS.panel,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20,
  };

  const sectionTitle = {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const divider = {
    height: 1,
    background: COLORS.border,
    margin: "16px 0",
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

  const callout = {
    background: `rgba(${hexToRgb(COLORS.accent)}, 0.10)`,
    border: `1px solid rgba(${hexToRgb(COLORS.accent)}, 0.35)`,
    padding: "12px 14px",
    borderRadius: 10,
    marginBottom: 16,
  };

  const small = { color: COLORS.muted, fontSize: 12 };

  return (
    <div>
      <div
        style={{
          ...card,
          background: "transparent",
          border: "none",
          display: "grid",
          gap: 6,
        }}
      >
        <h1 style={{ ...styles.h1, margin: 0 }}>
          <span
            style={{ color: COLORS.accent, transition: "color 120ms ease" }}
          >
            Legal Notice
          </span>
        </h1>

        <p style={{ ...small, margin: 0 }}>Last updated: October 25, 2025</p>
      </div>

      {/* Main legal notice card begins here */}
      <div style={{ ...card, marginTop: 16 }}>
        {/* Banner */}
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 8,
          }}
        >
          CONFIDENTIAL —{" "}
          <span
            style={{ color: COLORS.accent, transition: "color 120ms ease" }}
          >
            FOR INTERNAL USE ONLY
          </span>
        </div>

        <div style={divider} />

        {/* Summary (kept as a callout) */}
        <div style={callout}>
          The content of Almanac Pro is intended solely for internal use by
          Scout Motors employees. It includes proprietary insights, strategic
          commentary, and market analysis designed to inform brand positioning,
          product strategy, and business planning.
        </div>

        {/* Sections with clear headings (mirroring your prior structure) */}
        <h2 style={sectionTitle}>Use & Distribution</h2>
        <p style={{ color: COLORS.muted }}>
          All information contained herein, including references to competitors,
          industry trends, and product comparisons, is for informational
          purposes only and must not be shared externally. Unauthorized
          disclosure, distribution, or use of this material outside the company
          may result in disciplinary action and/or legal consequences.
        </p>

        <div style={divider} />

        <h2 style={sectionTitle}>Basis & Limitations</h2>
        <p style={{ color: COLORS.muted }}>
          The views and projections expressed in this application are based on
          current data, internal analysis, and available industry resources at
          the time of publication. They do not constitute official forecasts or
          guarantees of future performance.
        </p>

        <div style={divider} />

        <h2 style={sectionTitle}>Contact</h2>
        <p style={{ color: COLORS.muted }}>
          Questions about appropriate use of this material? Please contact the
          Legal team at{" "}
          <a
            href="mailto:brandlegalreview@scoutmotors.com"
            style={{ color: COLORS.accent, textDecoration: "none" }}
          >
            brandlegalreview@scoutmotors.com
          </a>
          .
        </p>
      </div>

      {/* Signature (bottom-right, slightly left) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
          paddingRight: 10, // nudge from hard-right edge
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

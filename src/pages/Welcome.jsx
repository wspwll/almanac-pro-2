// src/pages/Welcome.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Users,
  CreditCard,
  BarChart2,
  Globe,
  MessageSquare,
  FileText,
  Activity,
} from "lucide-react";

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

export default function Welcome({ COLORS, useStyles }) {
  const styles = useStyles(COLORS);

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
    // Perceived brightness (sRGB)
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
    padding: 18,
  };

  const grid3 = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
    gap: 16,
  };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
    gap: 16,
  };

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: COLORS.text,
    textDecoration: "none",
    fontWeight: 600,
  };

  const iconWrap = ({
    noFrame = false,
    bg = COLORS.linkActiveBg,
    size = 28,
  } = {}) => ({
    width: size,
    height: size,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    ...(noFrame
      ? {
          background: "transparent",
          border: "none",
          padding: 0,
        }
      : {
          background: bg,
          border: `1px solid ${COLORS.border}`,
        }),
  });

  const sourceCardContainer = (index) => ({
    display: "flex",
    flexDirection: "column",
    paddingRight: index < 2 ? 16 : 0, // spacing to divider
    borderRight: index < 2 ? `1px solid ${COLORS.border}` : "none",
  });

  const sourceCard = ({ icon: Icon, logo, name, uses }) => (
    <div style={{ ...card, border: "none", paddingLeft: 0, paddingRight: 0 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={iconWrap({ noFrame: !!logo, size: logo ? 34 : 28 })}>
          {logo ? (
            <img
              src={logo}
              alt={name}
              style={{ width: 30, height: "auto", objectFit: "contain" }}
            />
          ) : (
            <Icon size={16} />
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>
          {name}
        </div>
      </div>

      <ul
        style={{
          margin: "20px 0 0 0",
          paddingLeft: 0,
          color: COLORS.text,
          lineHeight: 1.6,
          listStyleType: "none",
        }}
      >
        {uses.map((u, i) => {
          const [label, desc] = u.split("—").map((s) => s.trim());
          return (
            <li
              key={i}
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ color: COLORS.text, fontWeight: 700 }}>{">"}</span>
              <div>
                <div
                  style={{
                    color: COLORS.text,
                    fontWeight: 550,
                    fontSize: "1rem",
                    lineHeight: 1.4,
                  }}
                >
                  {label}
                </div>
                {desc && (
                  <div
                    style={{
                      marginTop: 4,
                      fontStyle: "italic",
                      color: COLORS.muted,
                      fontSize: "0.9em",
                      lineHeight: 1.5,
                    }}
                  >
                    {desc}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div>
      <div
        style={{
          ...card,
          background: "transparent",
          border: "none",
          display: "grid",
          gap: 10,
        }}
      >
        <h1 style={{ ...styles.h1, margin: 0 }}>
          Welcome to{" "}
          <span
            style={{ color: COLORS.accent, transition: "color 120ms ease" }}
          >
            Scout Almanac Pro
          </span>
        </h1>

        <p style={{ color: COLORS.muted, margin: 0, fontSize: "1.3rem" }}>
          Connect insights across Scout's addressable market, customers, and
          competitive landscape.
        </p>
      </div>

      {/* Data Sources */}
      <div style={{ ...card, marginTop: 12 }}>
        <h2 style={{ margin: 0, marginLeft: 6, fontSize: 24 }}>Data Sources</h2>

        {/* Vertical dividers layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            marginTop: 12,
          }}
        >
          {[
            {
              logo: "/S&P logo.png",
              name: "S&P Global",
              uses: [
                "Vehicle registrations — How many units are sold and on the road",
                "Fleet mix — Share of fleet sales vs. retail sales",
                "Lease mix — Share of lease vs. purchase",
              ],
            },
            {
              logo: "/MI logo.png",
              name: "Motor Intel",
              uses: [
                "Dealership days' supply — How long models stay in inventory at dealerships",
                "Incentives cost — Discounts & financial support affecting demand",
              ],
            },
            {
              logo: "/Ipsos logo.png",
              name: "Ipsos NVCS",
              uses: [
                "Customer demographics — Who is buying which vehicle types",
                "Vehicle transaction prices — What customers actually pay for their new vehicle",
                "Product attitudes & sentiments — Customer perceptions and feelings about their vehicle",
              ],
            },
          ].map((props, index) => (
            <div
              key={index}
              style={{
                padding: "0 40px", // equal left + right spacing
                borderRight: index < 2 ? `1px solid ${COLORS.border}` : "none",
              }}
            >
              {sourceCard(props)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <h2 style={{ margin: 0, marginLeft: 6, fontSize: 24 }}>
          What you can do
        </h2>
        <div style={{ ...grid2, marginTop: 10 }}>
          <div
            style={{
              border: `1px dashed ${COLORS.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong
              style={{
                fontSize: 22,
                color: COLORS.accent,
                transition: "color 120ms ease",
              }}
            >
              Model
            </strong>
            <p style={{ color: COLORS.text, marginTop: 6, fontSize: "1em" }}>
              Use <em>Market Simulation</em> to test vehicle pricing factors,
              elasticity, and sales.
            </p>
            <NavLink to="/market-simulation" style={{ ...pill, marginTop: 6 }}>
              <Activity size={14} />
              Start a Scenario
            </NavLink>
          </div>
          <div
            style={{
              border: `1px dashed ${COLORS.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong
              style={{
                fontSize: 22,
                color: COLORS.accent,
                transition: "color 120ms ease",
              }}
            >
              Compare
            </strong>
            <p style={{ color: COLORS.text, marginTop: 6, fontSize: "1em" }}>
              Use <em>Customer Groups</em> to analyze the market's distinct
              customer profiles.
            </p>
            <NavLink to="/customer-groups" style={{ ...pill, marginTop: 6 }}>
              <Users size={14} />
              Explore Clusters
            </NavLink>
          </div>
          <div
            style={{
              border: `1px dashed ${COLORS.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong
              style={{
                fontSize: 22,
                color: COLORS.accent,
                transition: "color 120ms ease",
              }}
            >
              Understand
            </strong>
            <p style={{ color: COLORS.text, marginTop: 6, fontSize: "1em" }}>
              Use <em>Product Sentiments</em> to analyze attitudes and
              perceptions that shape vehicle preference and purchase decisions.
            </p>
            <NavLink to="/product-sentiments" style={{ ...pill, marginTop: 6 }}>
              <MessageSquare size={14} />
              See What Matters
            </NavLink>
          </div>
          <div
            style={{
              border: `1px dashed ${COLORS.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong
              style={{
                fontSize: 22,
                color: COLORS.accent,
                transition: "color 120ms ease",
              }}
            >
              Move
            </strong>
            <p style={{ color: COLORS.text, marginTop: 6, fontSize: "1em" }}>
              Turn insights into direction. Align your team, shape decisions,
              and move your work forward.
            </p>
          </div>
        </div>
      </div>
      {/* Signature (bottom-right) */}
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

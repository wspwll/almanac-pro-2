import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
} from "react-router-dom";
import {
  Home,
  Activity,
  Users,
  MessageSquare,
  Scale,
  Sun,
  Moon,
  Tractor,
  Mountain,
  Waves,
  Warehouse,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* -------------------- Lazy-loaded pages -------------------- */
const Welcome = lazy(() => import("./pages/Welcome"));
const MarketSimulation = lazy(() => import("./pages/MarketSimulation"));
const CustomerGroups = lazy(() => import("./pages/CustomerGroups"));
const ProductSentiments = lazy(() => import("./pages/ProductSentiments"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));

/* -------------------- Base Themes -------------------- */
const THEME_PALETTES = {
  dark: {
    name: "midnight",
    bg: "#0f172a",
    panel: "#111827",
    text: "#e5e7eb",
    muted: "#9ca3af",
    border: "#374151",
    accent: "#FF5432",
    accent2: "#FF5432",
    linkActiveBg: "rgba(255, 84, 50, 0.15)",
  },
  light: {
    name: "daylight",
    bg: "#f6f8fb",
    panel: "#ffffff",
    text: "#0b1220",
    muted: "#6b7280",
    border: "#e5e7eb",
    accent: "#FF5432",
    accent2: "#FF5432",
    linkActiveBg: "rgba(255, 84, 50, 0.15)",
  },
};

/* -------------------- Accent Color Modes -------------------- */
const ACCENT_MODES = {
  harvester: {
    key: "harvester",
    label: "Harvester",
    hex: "#FF5432",
    icon: Tractor,
  },
  terra: { key: "terra", label: "Terra", hex: "#2E4E61", icon: Mountain },
  pacific: {
    key: "pacific",
    label: "Pacific Mist",
    hex: "#7AA5C9",
    icon: Waves,
  },
  silo: { key: "silo", label: "Silo", hex: "#788B61", icon: Warehouse },
};

/* -------------------- Root App -------------------- */
export default function App() {
  const initialTheme = (() => {
    const saved = window.localStorage.getItem("almanac_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  })();

  const initialAccent = (() => {
    const saved = window.localStorage.getItem("almanac_accent");
    return ACCENT_MODES[saved]?.key || "harvester";
  })();

  const [theme, setTheme] = useState(initialTheme);
  const [colorMode, setColorMode] = useState(initialAccent);

  const COLORS = useMemo(() => {
    const base = THEME_PALETTES[theme];
    const accentHex = ACCENT_MODES[colorMode].hex;
    return {
      ...base,
      accent: accentHex,
      accent2: accentHex,
      linkActiveBg: hexToAlpha(accentHex, 0.15),
    };
  }, [theme, colorMode]);

  useEffect(() => {
    window.localStorage.setItem("almanac_theme", theme);
    const root = document.documentElement;
    root.style.background = COLORS.bg;
    root.style.color = COLORS.text;
    root.style.setProperty("color-scheme", theme);
  }, [theme, COLORS]);

  useEffect(() => {
    window.localStorage.setItem("almanac_accent", colorMode);
  }, [colorMode]);

  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          <Route
            element={
              <Layout
                theme={theme}
                setTheme={setTheme}
                COLORS={COLORS}
                colorMode={colorMode}
                setColorMode={setColorMode}
              />
            }
          >
            <Route
              index
              element={<Welcome COLORS={COLORS} useStyles={useStyles} />}
            />
            <Route
              path="market-simulation"
              element={
                <MarketSimulation COLORS={COLORS} useStyles={useStyles} />
              }
            />
            <Route
              path="customer-groups"
              element={<CustomerGroups COLORS={COLORS} useStyles={useStyles} />}
            />
            <Route
              path="product-sentiments"
              element={
                <ProductSentiments COLORS={COLORS} useStyles={useStyles} />
              }
            />
            <Route
              path="legal-notice"
              element={<LegalNotice COLORS={COLORS} useStyles={useStyles} />}
            />
            <Route path="*" element={<NotFound COLORS={COLORS} />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function getLogoSrc(theme, colorMode) {
  const dark = theme === "dark";
  switch (colorMode) {
    case "pacific":
      return dark
        ? "/almanac-pro-pacific-fog.png"
        : "/almanac-pro-pacific-moonstone.png";
    case "silo":
      return dark
        ? "/almanac-pro-silo-fog.png"
        : "/almanac-pro-silo-moonstone.png";
    case "terra":
      return dark
        ? "/almanac-pro-terra-fog.png"
        : "/almanac-pro-terra-moonstone.png";
    case "harvester":
    default:
      return dark ? "/almanac-pro-fog.png" : "/almanac-pro-logo-moonstone.png";
  }
}

function getCollapsedIconSrc(colorMode) {
  switch (colorMode) {
    case "pacific":
      return "/scout-circle-mist.png";
    case "silo":
      return "/scout-circle-silo.png";
    case "terra":
      return "/scout-circle-terra.png";
    case "harvester":
    default:
      return "/scout-circle-harvest.png";
  }
}

/* -------------------- Layout -------------------- */
function Layout({ theme, setTheme, COLORS, colorMode, setColorMode }) {
  const initialPlaid = (() => {
    const saved = window.localStorage.getItem("almanac_plaid");
    return saved === null ? true : saved === "true";
  })();

  const initialCollapsed = (() => {
    const saved = window.localStorage.getItem("almanac_sidebar_collapsed");
    return saved === "true";
  })();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [plaidOn, setPlaidOn] = useState(initialPlaid);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const styles = useStyles(COLORS, theme, plaidOn, collapsed);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const togglePlaid = () => {
    setPlaidOn((v) => {
      const next = !v;
      window.localStorage.setItem("almanac_plaid", String(next));
      return next;
    });
  };
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem("almanac_sidebar_collapsed", String(next));
      if (next) setDrawerOpen(false);
      return next;
    });
  };

  return (
    <>
      <style>{`
        html, body, #root {
          background: ${COLORS.bg};
          color: ${COLORS.text};
          height: 100%;
          margin: 0;
          font-family: Barlow, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            transition-duration: 0.001ms !important;
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          height: "100vh",
          background: COLORS.bg,
          color: COLORS.text,
        }}
      >
        <aside style={styles.sidebar}>
          <div style={styles.brandRow}>
            <div style={styles.brand(collapsed)}>
              {collapsed ? (
                <img
                  src={getCollapsedIconSrc(colorMode)}
                  alt="Scout Icon"
                  title="Expand sidebar"
                  style={styles.brandIcon}
                />
              ) : (
                <img
                  src={getLogoSrc(theme, colorMode)}
                  alt="Scout Logo"
                  style={styles.brandLogoFull}
                />
              )}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ marginTop: -5 }}>
            <SideLink
              COLORS={COLORS}
              to="/"
              icon={Home}
              label="Welcome"
              end
              collapsed={collapsed}
            />
            <SideLink
              COLORS={COLORS}
              to="/market-simulation"
              icon={Activity}
              label="Market Simulation"
              collapsed={collapsed}
            />
            <SideLink
              COLORS={COLORS}
              to="/customer-groups"
              icon={Users}
              label="Customer Groups"
              collapsed={collapsed}
            />
            <SideLink
              COLORS={COLORS}
              to="/product-sentiments"
              icon={MessageSquare}
              label="Product Sentiments"
              collapsed={collapsed}
            />
            <SideLink
              COLORS={COLORS}
              to="/legal-notice"
              icon={Scale}
              label="Legal Notice"
              collapsed={collapsed}
            />
          </nav>

          <div style={styles.sidebarSpacer} />

          {/* Theme drawer (hidden when collapsed) */}
          {!collapsed && (
            <>
              <button
                type="button"
                onClick={() => setDrawerOpen((v) => !v)}
                style={styles.drawerToggle}
              >
                <span style={{ fontWeight: 700 }}>Themes</span>
                {drawerOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronUp size={16} />
                )}
              </button>

              <div
                style={{
                  ...styles.drawer,
                  maxHeight: drawerOpen ? 320 : 0,
                  opacity: drawerOpen ? 1 : 0,
                  transform: `translateY(${drawerOpen ? "0px" : "8px"})`,
                }}
              >
                <button
                  type="button"
                  onClick={toggleTheme}
                  style={{ ...styles.themeToggle, marginBottom: 10 }}
                >
                  <div style={styles.toggleKnob(theme === "dark")}>
                    {theme === "dark" ? (
                      <Moon size={14} strokeWidth={1.75} />
                    ) : (
                      <Sun size={14} strokeWidth={1.75} />
                    )}
                  </div>
                  <span style={{ marginLeft: 10, fontWeight: 600 }}>
                    {theme === "dark" ? "Midnight" : "Daylight"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={togglePlaid}
                  style={{ ...styles.themeToggle, marginBottom: 10 }}
                  title="Toggle plaid background"
                >
                  <div style={styles.toggleKnob(!plaidOn)}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        border: `2px solid ${COLORS.border}`,
                        background: plaidOn ? COLORS.accent : "transparent",
                      }}
                    />
                  </div>
                  <span style={{ marginLeft: 10, fontWeight: 600 }}>Plaid</span>
                </button>

                <div style={styles.swatchGrid}>
                  {Object.values(ACCENT_MODES).map((m) => (
                    <ColorIcon
                      key={m.key}
                      label={m.label}
                      icon={m.icon}
                      hex={m.hex}
                      active={colorMode === m.key}
                      onSelect={() => setColorMode(m.key)}
                      COLORS={COLORS}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Bottom collapse/expand button — hide when drawer is open to avoid overlap */}
          {(collapsed || !drawerOpen) && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={styles.collapseBtnBottom(collapsed)}
            >
              {collapsed ? (
                <ChevronRight size={16} strokeWidth={2} />
              ) : (
                <ChevronLeft size={16} strokeWidth={2} />
              )}
            </button>
          )}
        </aside>

        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  );
}

/* -------------------- Color Mode Icon Button -------------------- */
function ColorIcon({ label, icon: Icon, hex, active, onSelect, COLORS }) {
  const tileBg = rgbaStringToSolidHex(hexToAlpha(hex, 0.08), COLORS.panel);
  const activeBg = rgbaStringToSolidHex(
    hexToAlpha(COLORS.accent, 0.12),
    COLORS.panel
  );

  const border = active
    ? `2px solid ${COLORS.accent}`
    : `1px solid ${COLORS.border}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${label} mode`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: active ? activeBg : tileBg,
        color: COLORS.text,
        border,
        borderRadius: 12,
        padding: 10,
        cursor: "pointer",
        transition: "border-color 360ms ease, transform 360ms ease",
      }}
    >
      <Icon size={26} color={hex} strokeWidth={1.8} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function HoverTip({ text, anchorRect, COLORS }) {
  if (!anchorRect) return null;
  const top = anchorRect.top + anchorRect.height / 2;
  const left = anchorRect.right + 8;

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateY(-50%)",
        background: COLORS.panel,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 13,
        fontWeight: 600,
        boxShadow:
          "0 6px 18px rgba(0,0,0,0.25), 0 1px 0 rgba(0,0,0,0.08) inset",
        zIndex: 9999,
        pointerEvents: "none",
        opacity: 0.98,
        transition: "opacity 120ms ease, transform 160ms ease",
        whiteSpace: "nowrap",
      }}
      role="tooltip"
    >
      {text}
    </div>
  );
}

/* -------------------- Utilities -------------------- */
function SideLink({ to, icon: Icon, label, end, COLORS, collapsed }) {
  const styles = useStyles(COLORS, undefined, undefined, collapsed);
  const solidActiveBg = rgbaStringToSolidHex(COLORS.linkActiveBg, COLORS.panel);
  const hoverBg = rgbaStringToSolidHex(
    hexToAlpha(COLORS.accent, 0.08),
    COLORS.panel
  );

  const [isHover, setIsHover] = useState(false);
  const [rect, setRect] = useState(null);
  const linkRef = React.useRef(null);

  const handleEnter = () => {
    setIsHover(true);
    if (linkRef.current) setRect(linkRef.current.getBoundingClientRect());
  };
  const handleLeave = () => {
    setIsHover(false);
    setRect(null);
  };

  return (
    <>
      <NavLink
        ref={linkRef}
        to={to}
        end={end}
        title={collapsed ? label : undefined}
        aria-label={label}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={({ isActive }) => ({
          ...styles.link,
          background: isActive
            ? solidActiveBg
            : isHover
            ? hoverBg
            : "transparent",
          borderColor: isActive ? COLORS.accent2 : "transparent",
          justifyContent: collapsed ? "center" : "flex-start",
        })}
      >
        <span style={styles.linkIcon}>
          <Icon size={18} style={{ width: 18, height: 18, flex: "0 0 auto" }} />
        </span>
        <span style={styles.linkLabel(collapsed)}>{label}</span>
      </NavLink>

      {collapsed && isHover && (
        <HoverTip text={label} anchorRect={rect} COLORS={COLORS} />
      )}
    </>
  );
}

function NotFound({ COLORS }) {
  const styles = useStyles(COLORS);
  return (
    <div>
      <h1 style={styles.h1}>Not Found</h1>
      <p style={{ color: COLORS.muted }}>The page does not exist.</p>
    </div>
  );
}

function useStyles(COLORS, theme, plaidOn = true, collapsed = false) {
  const isDark = theme === "dark";

  const btnBg = rgbaStringToSolidHex(
    hexToAlpha(COLORS.accent, isDark ? 0.1 : 0.08),
    COLORS.panel
  );
  const knobBgLight = rgbaStringToSolidHex(
    hexToAlpha("#ffffff", 0.15),
    COLORS.panel
  );
  const knobBgDark = rgbaStringToSolidHex(
    hexToAlpha("#ffffff", 0.06),
    COLORS.panel
  );

  return {
    sidebar: {
      background: COLORS.panel,
      color: COLORS.text,
      padding: "16px 16px 24px",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      boxSizing: "border-box",
      position: "relative",
      zIndex: 2,
      overflow: "hidden",
      boxShadow: isDark
        ? "8px 0 24px rgba(0,0,0,0.55), 1px 0 0 rgba(0,0,0,0.25)"
        : "0px 0 20px rgba(0,0,0,0.25), 0px 0 0 rgba(0,0,0,0.1)",
      ...plaidTexture(COLORS, theme, plaidOn ? 1 : 0),

      width: collapsed ? 88 : 270,
      transition: "width 520ms cubic-bezier(.22,.61,.17,.99)",
      willChange: "width",
    },

    sidebarSpacer: { flex: 1 },

    brandRow: {
      display: "grid",
      gridTemplateColumns: "1fr",
      position: "relative",
      alignItems: "center",
      gap: 8,
      minHeight: 72,
      marginBottom: 12,
    },

    brand: (collapsed) => ({
      display: collapsed ? "grid" : "flex",
      placeItems: collapsed ? "center" : "unset",
      alignItems: "center",
      gap: 10,
      padding: collapsed ? "20px 0 8px 0" : "20px 12px 8px 12px",
      justifyContent: collapsed ? "center" : "flex-start",
      minHeight: 36,
      width: "100%",
    }),

    // New: full-size logo (expanded)
    brandLogoFull: {
      height: 36,
      width: "auto",
      opacity: 1,
      transform: "translateX(0)",
      transition: "opacity 520ms ease, transform 520ms ease",
      pointerEvents: "auto",
    },

    brandIcon: {
      width: 32,
      height: 32,
      objectFit: "contain",
      display: "block",
      margin: "0 auto",
    },

    // Small centered toggle visible only in collapsed state (top of sidebar)
    collapseBtnCollapsed: {
      position: "absolute",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      display: "grid",
      placeItems: "center",
      width: 32,
      height: 32,
      borderRadius: 8,
      background: rgbaStringToSolidHex(
        hexToAlpha(COLORS.accent, 0.1),
        COLORS.panel
      ),
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      cursor: "pointer",
      transition:
        "background-color 320ms ease, border-color 320ms ease, transform 320ms ease",
      zIndex: 3,
    },

    // Bottom button pinned to bottom in both states
    collapseBtnBottom: (isCollapsed) => ({
      position: "absolute",
      bottom: 12,
      // center when collapsed, align left when expanded
      left: isCollapsed ? "50%" : 12,
      transform: isCollapsed ? "translateX(-50%)" : "none",
      display: "grid",
      placeItems: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      background: rgbaStringToSolidHex(
        hexToAlpha(COLORS.accent, 0.1),
        COLORS.panel
      ),
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      cursor: "pointer",
      transition:
        "background-color 320ms ease, border-color 320ms ease, transform 320ms ease, left 520ms cubic-bezier(.22,.61,.17,.99)",
      zIndex: 3,
    }),

    link: {
      display: "flex",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: 10,
      borderLeft: "3px solid transparent",
      padding: "0 12px",
      minHeight: 44,
      borderRadius: 8,
      color: COLORS.text,
      textDecoration: "none",
      margin: "12px 0",
      fontSize: 16,
      fontWeight: 500,
      width: "100%",
      boxSizing: "border-box",
      maxWidth: "100%",
      overflow: "hidden",
      transition: [
        "background-color 240ms ease",
        "border-color 240ms ease",
        "color 240ms ease",
      ].join(", "),
      ":hover": {
        background: rgbaStringToSolidHex(
          hexToAlpha(COLORS.accent, 0.08),
          COLORS.panel
        ),
        color: COLORS.text,
      },
    },

    linkIcon: {
      width: 18,
      height: 18,
      minWidth: 18,
      minHeight: 18,
      flex: "0 0 18px",
      display: "grid",
      placeItems: "center",
    },

    linkLabel: (collapsed) => ({
      flex: "1 1 auto",
      minWidth: 0,
      whiteSpace: "nowrap",
      opacity: collapsed ? 0 : 1,
      transform: `translateX(${collapsed ? "-6px" : "0"})`,
      maxWidth: collapsed ? 0 : 240,
      transition:
        "opacity 520ms ease, transform 520ms ease, max-width 560ms ease",
      overflow: "hidden",
    }),

    main: {
      background: COLORS.bg,
      color: COLORS.text,
      padding: 24,
      overflowY: "auto",
      position: "relative",
      zIndex: 1,
    },

    h1: { margin: 0, fontSize: 36, color: COLORS.text },

    themeToggle: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      padding: "10px 12px",
      background: btnBg,
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 8,
      transition: "background-color 360ms ease, border-color 360ms ease",
    },

    toggleKnob: (isDarkKnob) => ({
      width: 28,
      height: 28,
      borderRadius: 999,
      border: `1px solid ${COLORS.border}`,
      background: isDarkKnob ? knobBgDark : knobBgLight,
      display: "grid",
      placeItems: "center",
      transition: "background-color 360ms ease, border-color 360ms ease",
    }),

    drawerToggle: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      padding: "10px 12px",
      background: btnBg,
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 14,
      fontWeight: 600,
      transition: "background-color 360ms ease, border-color 360ms ease",
    },

    drawer: {
      overflow: "hidden",
      transition:
        "max-height 520ms ease, opacity 420ms ease, transform 420ms ease",
      marginTop: 8,
      border: "none",
      borderRadius: 12,
      padding: 12,
      background: "transparent",
    },

    swatchGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    },
  };
}

function hexToAlpha(hex, alpha = 0.15) {
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
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbaStringToSolidHex(rgba, bgHex) {
  const match = rgba.match(
    /rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/
  );
  if (!match) return rgba;

  const r = parseFloat(match[1]);
  const g = parseFloat(match[2]);
  const b = parseFloat(match[3]);
  const a = parseFloat(match[4]);

  const bg = bgHex.replace("#", "");
  const full =
    bg.length === 3
      ? bg
          .split("")
          .map((c) => c + c)
          .join("")
      : bg;
  const br = parseInt(full.slice(0, 2), 16);
  const bgG = parseInt(full.slice(2, 4), 16);
  const bb = parseInt(full.slice(4, 6), 16);

  const outR = Math.round(r * a + br * (1 - a));
  const outG = Math.round(g * a + bgG * (1 - a));
  const outB = Math.round(b * a + bb * (1 - a));

  return `#${[outR, outG, outB]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function plaidTexture(COLORS, theme, intensity = 1) {
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const k = clamp(intensity, 0, 1);
  const isDark = theme === "dark";

  const thinA = isDark ? 0.1 : 0.01;
  const thickA = isDark ? 0.2 : 0.02;
  const accentA = isDark ? 0.03 : 0.04;

  const thin = isDark
    ? `rgba(255,255,255,${thinA * k})`
    : `rgba(0,0,0,${thinA * k})`;
  const thick = isDark
    ? `rgba(255,255,255,${thickA * k})`
    : `rgba(0,0,0,${thickA * k})`;
  const accentVeil = hexToAlpha(COLORS.accent, accentA * k);

  const blend = isDark
    ? "normal, overlay, overlay"
    : "normal, multiply, multiply";

  return {
    backgroundColor: COLORS.panel,
    backgroundImage:
      k === 0
        ? "none"
        : `
      linear-gradient(${accentVeil}, ${accentVeil}),
      repeating-linear-gradient(0deg,
        transparent 0, transparent 6px,
        ${thin} 6px, ${thin} 7px,
        transparent 7px, transparent 14px,
        ${thin} 14px, ${thin} 15px,
        transparent 15px, transparent 30px,
        ${thick} 30px, ${thick} 31px
      ),
      repeating-linear-gradient(90deg,
        transparent 0, transparent 6px,
        ${thin} 6px, ${thin} 7px,
        transparent 7px, transparent 14px,
        ${thin} 14px, ${thin} 15px,
        transparent 15px, transparent 30px,
        ${thick} 30px, ${thick} 31px
      )`,
    backgroundBlendMode: k === 0 ? "normal" : blend,
    backgroundSize: k === 0 ? "auto" : "auto, 40px 40px, 40px 40px",
    backgroundPosition: "0 0, 0 0, 0 0",
  };
}

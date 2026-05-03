import { useEffect, useRef, useState } from "react";

type Phase = "entering" | "greeting" | "waving" | "exiting" | "done";

export default function HomeGreeter() {
  const [phase, setPhase] = useState<Phase>("entering");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const t1 = setTimeout(() => setPhase("greeting"), 1400);
    const t2 = setTimeout(() => setPhase("waving"),   4200);
    const t3 = setTimeout(() => setPhase("exiting"),  5800);
    const t4 = setTimeout(() => setPhase("done"),     6800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  if (phase === "done") return null;

  const isWalking  = phase === "entering" || phase === "exiting";
  const isWaving   = phase === "waving";
  const showBubble = phase === "greeting" || phase === "waving";

  const sliderStyle: React.CSSProperties = {
    transform:  !mounted || phase === "exiting" ? "translateX(-180px)" : "translateX(0px)",
    transition: phase === "exiting"
      ? "transform 1s ease-in"
      : "transform 1.3s cubic-bezier(0.22,1,0.36,1)",
  };

  const bobStyle: React.CSSProperties = isWalking
    ? { animation: "walk-bob 0.38s ease-in-out infinite alternate" }
    : {};

  const armStyle = (dir: "l" | "r", origin: string): React.CSSProperties => {
    if (isWaving && dir === "r") {
      return {
        transformOrigin: origin,
        animation: "greeter-wave 0.55s ease-in-out 3 forwards",
      };
    }
    if (!isWalking) return { transformOrigin: origin };
    return {
      transformOrigin: origin,
      animation: `walk-arm-${dir} 0.38s ease-in-out infinite alternate`,
    };
  };

  const legStyle = (dir: "l" | "r", origin: string): React.CSSProperties => {
    if (!isWalking) return { transformOrigin: origin };
    return {
      transformOrigin: origin,
      animation: `walk-leg-${dir} 0.38s ease-in-out infinite alternate`,
    };
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 20,
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        ...sliderStyle,
      }}
    >
      {/* Speech bubble */}
      <div
        style={{
          marginBottom: 8,
          marginLeft: 4,
          animation: showBubble
            ? "greeter-bubble-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards"
            : phase === "exiting"
            ? "greeter-bubble-out 0.3s ease-in forwards"
            : "none",
          display: showBubble || phase === "exiting" ? "block" : "none",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "3px solid #000",
            boxShadow: "3px 3px 0 #000",
            padding: "8px 14px",
            fontFamily: "var(--app-font-heading)",
            fontWeight: 900,
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            position: "relative",
          }}
        >
          Hello! Welcome 👋
          {/* Bubble tail — outer */}
          <div
            style={{
              position: "absolute",
              bottom: -10,
              left: 18,
              width: 0,
              height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: "10px solid #000",
            }}
          />
          {/* Bubble tail — inner (white fill) */}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: 20,
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "7px solid #fff",
            }}
          />
        </div>
      </div>

      {/* The stick figure */}
      <div style={bobStyle}>
        <svg viewBox="0 0 64 108" width="72" height="121" overflow="visible">
          {/* Ground shadow */}
          <ellipse cx="32" cy="104" rx="14" ry="4" fill="#00000018" />

          {/* Head */}
          <circle cx="32" cy="14" r="12" fill="#FF8D3F" stroke="#000" strokeWidth="2.5" />
          <circle cx="28" cy="12" r="1.8" fill="#000" />
          <circle cx="36" cy="12" r="1.8" fill="#000" />
          <path d="M27 18 Q32 22 37 18" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Hair */}
          <line x1="28" y1="3"  x2="26" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="2"  x2="32" y2="-1" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="3"  x2="38" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />

          {/* Body */}
          <line x1="32" y1="26" x2="32" y2="64" stroke="#000" strokeWidth="3" strokeLinecap="round" />

          {/* Left arm (holds laptop) */}
          <g style={armStyle("l", "32px 36px")}>
            <line x1="32" y1="36" x2="13" y2="52" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
            <rect x="2" y="49" width="12" height="8" fill="#FF8D3F" stroke="#000" strokeWidth="1.8" />
            <line x1="2" y1="57" x2="14" y2="57" stroke="#000" strokeWidth="1.5" />
          </g>

          {/* Right arm (waves) */}
          <g style={armStyle("r", "32px 36px")}>
            <line x1="32" y1="36" x2="51" y2="52" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
          </g>

          {/* Left leg */}
          <g style={legStyle("l", "32px 64px")}>
            <line x1="32" y1="64" x2="20" y2="88" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="17" cy="90" rx="7" ry="3.5" fill="#000" />
          </g>

          {/* Right leg */}
          <g style={legStyle("r", "32px 64px")}>
            <line x1="32" y1="64" x2="44" y2="88" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="47" cy="90" rx="7" ry="3.5" fill="#000" />
          </g>
        </svg>
      </div>
    </div>
  );
}

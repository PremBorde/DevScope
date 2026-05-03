import { useEffect, useState } from "react";

type Phase = "entering" | "greeting" | "waving" | "exiting" | "done";

interface Props {
  message?:       string;
  side?:          "left" | "right";
  speed?:         "walk" | "run";
  scoreReaction?: number;
  onDone?:        () => void;
}

const CLICK_MESSAGES = [
  "I'm just an SVG! 😅",
  "Ouch! Stop poking! 😤",
  "One more click… 🥚",
  "Easter egg found! ✨",
  "Fine, you win 🏳️",
];

export default function HomeGreeter({
  message = "Hello! Welcome 👋",
  side    = "left",
  speed   = "walk",
  scoreReaction,
  onDone,
}: Props) {
  const [phase,          setPhase]          = useState<Phase>("entering");
  const [mounted,        setMounted]        = useState(false);
  const [isIdle,         setIsIdle]         = useState(false);
  const [isScoreJump,    setIsScoreJump]    = useState(false);
  const [isClickJump,    setIsClickJump]    = useState(false);
  const [isShaking,      setIsShaking]      = useState(false);
  const [clickIdx,       setClickIdx]       = useState(0);
  const [displayMsg,     setDisplayMsg]     = useState(message);

  /* Derive score message once scoreReaction is known */
  useEffect(() => {
    if (scoreReaction !== undefined) {
      setDisplayMsg(
        scoreReaction >= 80 ? "Rockstar dev! 🌟" :
        scoreReaction >= 60 ? "Solid skills! 💪" :
        scoreReaction >= 40 ? "Room to grow! 📈" :
        "We'll get there! 😅",
      );
    }
  }, [scoreReaction]);

  /* Main phase sequence */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const t1 = setTimeout(() => setPhase("greeting"), 1400);
    const t2 = setTimeout(() => setPhase("waving"),   4000);
    const t3 = setTimeout(() => setPhase("exiting"),  5600);
    const t4 = setTimeout(() => { setPhase("done"); onDone?.(); }, 6600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  /* Idle foot-tap after 2 s of greeting */
  useEffect(() => {
    if (phase === "greeting") {
      const t = setTimeout(() => setIsIdle(true), 2000);
      return () => clearTimeout(t);
    }
    setIsIdle(false);
  }, [phase]);

  /* Celebratory jump for 80+ score */
  useEffect(() => {
    if (phase === "greeting" && scoreReaction !== undefined && scoreReaction >= 80) {
      const t1 = setTimeout(() => setIsScoreJump(true),  600);
      const t2 = setTimeout(() => setIsScoreJump(false), 1300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [phase, scoreReaction]);

  if (phase === "done") return null;

  const isWalking  = phase === "entering" || phase === "exiting";
  const isWaving   = phase === "waving";
  const isStanding = !isWalking;
  const showBubble = phase === "greeting" || phase === "waving";
  const isClickable = isStanding && !isClickJump;

  const dur = speed === "run" ? "0.18s" : "0.38s";

  /* Slide transition */
  const hiddenX  = side === "left" ? "translateX(-180px)" : "translateX(180px)";
  const sliderStyle: React.CSSProperties = {
    transform:  !mounted || phase === "exiting" ? hiddenX : "translateX(0px)",
    transition: phase === "exiting" ? "transform 1s ease-in" : "transform 1.3s cubic-bezier(0.22,1,0.36,1)",
  };

  /* Figure body animation */
  const figStyle: React.CSSProperties =
    isClickJump   ? { animation: "greeter-click-jump 0.5s ease-out forwards" } :
    isScoreJump   ? { animation: "greeter-jump 0.65s ease-out forwards" }       :
    isShaking     ? { animation: "greeter-shake 0.4s ease-in-out forwards" }    :
    isWalking     ? { animation: `walk-bob ${dur} ease-in-out infinite alternate` } :
    {};

  const armStyle = (dir: "l" | "r", origin: string): React.CSSProperties => {
    if (isWaving && dir === "r")
      return { transformOrigin: origin, animation: "greeter-wave 0.55s ease-in-out 3 forwards" };
    if (!isWalking) return { transformOrigin: origin };
    return { transformOrigin: origin, animation: `walk-arm-${dir} ${dur} ease-in-out infinite alternate` };
  };

  const legStyle = (dir: "l" | "r", origin: string): React.CSSProperties => {
    if (isIdle && !isWalking && dir === "l")
      return { transformOrigin: origin, animation: "greeter-idle-tap 0.8s ease-in-out infinite" };
    if (!isWalking) return { transformOrigin: origin };
    return { transformOrigin: origin, animation: `walk-leg-${dir} ${dur} ease-in-out infinite alternate` };
  };

  /* Click handler */
  const handleClick = () => {
    if (!isClickable) return;
    const idx = clickIdx % CLICK_MESSAGES.length;
    setClickIdx((c) => c + 1);
    setDisplayMsg(CLICK_MESSAGES[idx]);
    if (idx === 1) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
    } else {
      setIsClickJump(true);
      setTimeout(() => setIsClickJump(false), 550);
    }
  };

  /* Face variants based on score */
  const isSad     = scoreReaction !== undefined && scoreReaction < 40;
  const isExcited = scoreReaction !== undefined && scoreReaction >= 80;
  const borderColor = isExcited ? "#FF8D3F" : isSad ? "#ef4444" : "#000";

  /* Bubble tail positioning */
  const tailPos  = side === "right" ? { right: 12, left: "auto" as const } : { left: 18, right: "auto" as const };
  const tailIPos = side === "right" ? { right: 14, left: "auto" as const } : { left: 20, right: "auto" as const };

  return (
    <div
      onClick={handleClick}
      title={isClickable ? "Click me!" : undefined}
      style={{
        position:     "fixed",
        bottom:       0,
        left:         side === "left"  ? 20     : "auto",
        right:        side === "right" ? 20     : "auto",
        zIndex:       9999,
        pointerEvents: isClickable ? "auto" : "none",
        cursor:       isClickable ? "pointer" : "default",
        display:      "flex",
        flexDirection: "column",
        alignItems:   side === "right" ? "flex-end" : "flex-start",
        ...sliderStyle,
      }}
    >
      {/* ── Speech bubble ─────────────────────────────────── */}
      <div
        style={{
          marginBottom: 8,
          marginLeft:  side === "left"  ? 4 : 0,
          marginRight: side === "right" ? 4 : 0,
          display:   showBubble || phase === "exiting" ? "block" : "none",
          animation: showBubble
            ? "greeter-bubble-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards"
            : "greeter-bubble-out 0.3s ease-in forwards",
        }}
      >
        <div
          style={{
            background:   "#fff",
            border:       `3px solid ${borderColor}`,
            boxShadow:    `3px 3px 0 ${borderColor}`,
            padding:      "8px 14px",
            fontFamily:   "var(--app-font-heading)",
            fontWeight:   900,
            fontSize:     "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            whiteSpace:   "nowrap",
            position:     "relative",
          }}
        >
          {displayMsg}
          {/* Tail outer */}
          <div style={{ position:"absolute", bottom:-10, ...tailPos,  width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", borderTop:`10px solid ${borderColor}` }} />
          {/* Tail inner */}
          <div style={{ position:"absolute", bottom:-6,  ...tailIPos, width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderTop:"7px solid #fff" }} />
        </div>
      </div>

      {/* ── Stick figure ──────────────────────────────────── */}
      <div style={figStyle}>
        <svg
          viewBox="0 0 64 108"
          width="72"
          height="121"
          overflow="visible"
          style={side === "right" ? { transform: "scaleX(-1)" } : undefined}
        >
          {/* Shadow */}
          <ellipse cx="32" cy="104" rx="14" ry="4" fill="#00000018" />

          {/* Head */}
          <circle cx="32" cy="14" r="12" fill="#FF8D3F" stroke="#000" strokeWidth="2.5" />

          {/* Eyes — stars when excited */}
          {isExcited ? (
            <>
              <text x="25" y="15" fontSize="9" textAnchor="middle" fill="#000">★</text>
              <text x="39" y="15" fontSize="9" textAnchor="middle" fill="#000">★</text>
            </>
          ) : (
            <>
              <circle cx="28" cy="12" r="1.8" fill="#000" />
              <circle cx="36" cy="12" r="1.8" fill="#000" />
            </>
          )}

          {/* Mouth — sad when score < 40 */}
          {isSad
            ? <path d="M27 21 Q32 17 37 21" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            : <path d="M27 18 Q32 22 37 18" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          }

          {/* Hair */}
          <line x1="28" y1="3"  x2="26" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="2"  x2="32" y2="-1" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="3"  x2="38" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />

          {/* Body */}
          <line x1="32" y1="26" x2="32" y2="64" stroke="#000" strokeWidth="3" strokeLinecap="round" />

          {/* Left arm — holds laptop */}
          <g style={armStyle("l", "32px 36px")}>
            <line x1="32" y1="36" x2="13" y2="52" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
            <rect x="2" y="49" width="12" height="8" fill="#FF8D3F" stroke="#000" strokeWidth="1.8" />
            <line x1="2" y1="57" x2="14" y2="57" stroke="#000" strokeWidth="1.5" />
          </g>

          {/* Right arm — waves */}
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

import { useEffect, useRef, useState } from "react";
import { suppressNextInputBlur } from "@/lib/greeterBus";

type Phase = "entering" | "greeting" | "waving" | "exiting" | "done";
export type HatType = "hard" | "grad" | "party" | "sleep" | null;

interface Props {
  message?:       string;
  side?:          "left" | "right";
  speed?:         "walk" | "run";
  scoreReaction?: number;
  hat?:           HatType;
  confetti?:      boolean;
  quick?:         boolean;
  persistent?:    boolean;
  shouldExit?:    boolean;
  irritable?:     boolean;
  onIrritated?:   () => void;
  onDone?:        () => void;
}

const CLICK_MESSAGES = [
  "I'm just an SVG! 😅",
  "Ouch! Stop poking! 😤",
  "You're persistent! 😅",
  "OK fine, I respect it 🫡",
  "I give up… 🏳️",
];

const CONFETTI_COLORS = ["#FF8D3F","#FFD700","#FF4444","#44BB44","#4488FF","#FF44FF","#44FFDD"];

export default function HomeGreeter({
  message       = "Hello! Welcome 👋",
  side          = "left",
  speed         = "walk",
  scoreReaction,
  hat           = null,
  confetti      = false,
  quick         = false,
  persistent    = false,
  shouldExit    = false,
  irritable     = false,
  onIrritated,
  onDone,
}: Props) {
  const [phase,         setPhase]        = useState<Phase>("entering");
  const [mounted,       setMounted]      = useState(false);
  const [isIdle,        setIsIdle]       = useState(false);
  const [isScoreJump,   setIsScoreJump]  = useState(false);
  const [isClickJump,   setIsClickJump]  = useState(false);
  const [isShaking,     setIsShaking]    = useState(false);
  const [isBackflip,    setIsBackflip]   = useState(false);
  const [clickIdx,      setClickIdx]     = useState(0);
  const [displayMsg,    setDisplayMsg]   = useState(message);
  const [showConfetti,  setShowConfetti] = useState(false);
  const [comboTotal,    setComboTotal]   = useState(0);
  const [showCombo,     setShowCombo]    = useState(false);

  // Drag
  const [dragPos,    setDragPos]    = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOrigin   = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const didDragRef   = useRef(false);

  // Mini-game
  const lastClickMs = useRef(0);
  const comboRef    = useRef(0);
  const annoyRef    = useRef(0);

  /* Sync display message */
  useEffect(() => { setDisplayMsg(message); }, [message]);

  /* Phase sequence */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    if (persistent) {
      // Walk in and stay — never auto-exit; shouldExit prop drives the exit
      const t1 = setTimeout(() => setPhase("greeting"), 1400);
      return () => { cancelAnimationFrame(raf); clearTimeout(t1); };
    }
    if (quick) {
      const t1 = setTimeout(() => setPhase("greeting"), 700);
      const t2 = setTimeout(() => setPhase("exiting"),  2000);
      const t3 = setTimeout(() => { setPhase("done"); onDone?.(); }, 2900);
      return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    const t1 = setTimeout(() => setPhase("greeting"), 1400);
    const t2 = setTimeout(() => setPhase("waving"),   4000);
    const t3 = setTimeout(() => setPhase("exiting"),  5600);
    const t4 = setTimeout(() => { setPhase("done"); onDone?.(); }, 6600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  /* shouldExit — external trigger to start exit sequence */
  useEffect(() => {
    if (!shouldExit) return;
    if (phase === "done" || phase === "exiting") return;
    setPhase("exiting");
    const t = setTimeout(() => { setPhase("done"); onDone?.(); }, 1000);
    return () => clearTimeout(t);
  }, [shouldExit]);

  /* Idle foot-tap after 2 s of standing */
  useEffect(() => {
    if (phase === "greeting") {
      const t = setTimeout(() => setIsIdle(true), 2000);
      return () => clearTimeout(t);
    }
    setIsIdle(false);
  }, [phase]);

  /* Score jump for 80+ */
  useEffect(() => {
    if (phase === "greeting" && scoreReaction !== undefined && scoreReaction >= 80) {
      const t1 = setTimeout(() => setIsScoreJump(true),  600);
      const t2 = setTimeout(() => setIsScoreJump(false), 1300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [phase, scoreReaction]);

  /* Confetti burst */
  useEffect(() => {
    if (confetti && phase === "greeting") {
      const t1 = setTimeout(() => setShowConfetti(true),  400);
      const t2 = setTimeout(() => setShowConfetti(false), 2600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [confetti, phase]);

  /* Drag — global mouse tracking */
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragOrigin.current) return;
      const dx = e.clientX - dragOrigin.current.mx;
      const dy = e.clientY - dragOrigin.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
      setDragPos({ x: dragOrigin.current.ex + dx, y: dragOrigin.current.ey + dy });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",  onUp);
    };
  }, [isDragging]);

  if (phase === "done") return null;

  const isWalking   = phase === "entering" || phase === "exiting";
  const isWaving    = phase === "waving";
  const isStanding  = !isWalking;
  const showBubble  = phase === "greeting" || phase === "waving";
  const isClickable = isStanding && !isClickJump && !isBackflip;

  const dur = speed === "run" ? "0.18s" : "0.38s";

  /* Position — drag overrides slide */
  const hiddenX = side === "left" ? "translateX(-180px)" : "translateX(180px)";
  const posStyle: React.CSSProperties = dragPos
    ? { left: dragPos.x, top: dragPos.y, bottom: "auto", right: "auto" }
    : {
        bottom: 0,
        left:  side === "left"  ? 20   : "auto",
        right: side === "right" ? 20   : "auto",
        transform:  !mounted || phase === "exiting" ? hiddenX : "translateX(0px)",
        transition: phase === "exiting" ? "transform 1s ease-in" : "transform 1.3s cubic-bezier(0.22,1,0.36,1)",
      };

  /* Figure animation priority */
  const figStyle: React.CSSProperties =
    isBackflip  ? { animation: "greeter-backflip 0.75s ease-in-out forwards" }    :
    isClickJump ? { animation: "greeter-click-jump 0.5s ease-out forwards" }      :
    isScoreJump ? { animation: "greeter-jump 0.65s ease-out forwards" }            :
    isShaking   ? { animation: "greeter-shake 0.4s ease-in-out forwards" }         :
    isWalking   ? { animation: `walk-bob ${dur} ease-in-out infinite alternate` }  :
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

  /* Mouse down — start drag */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isStanding) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    // Prevent the input's blur from firing the watcher-exit sequence
    suppressNextInputBlur();
    didDragRef.current = false;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, ex: rect.left, ey: rect.top };
    setIsDragging(true);
  };

  /* Click — mini-game + message cycling */
  const handleClick = () => {
    if (!isClickable || isDragging || didDragRef.current) return;
    didDragRef.current = false;

    /* ── Irritable mode (watcher character) ──────────────── */
    if (irritable) {
      annoyRef.current += 1;
      const n = annoyRef.current;

      const ANNOY: Record<number, string> = {
        2: "Hey! That tickles! 😅",
        4: "Cut it out! 🙄",
        6: "I'm WARNING you! 😠",
        8: "SERIOUSLY?! STOP! 😡",
      };

      if (n >= 10) {
        // Final straw — storm off and never come back
        setDisplayMsg("That's IT!! I QUIT! 🚪💨");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setTimeout(() => {
          setPhase("exiting");
          setTimeout(() => {
            setPhase("done");
            onIrritated?.();
            onDone?.();
          }, 1000);
        }, 800);
        return;
      }

      if (ANNOY[n]) {
        setDisplayMsg(ANNOY[n]);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 450);
      } else {
        setIsClickJump(true);
        setTimeout(() => setIsClickJump(false), 550);
      }
      return;
    }

    const now = Date.now();
    if (now - lastClickMs.current < 3000) {
      comboRef.current += 1;
    } else {
      comboRef.current = 1;
    }
    lastClickMs.current = now;

    if (comboRef.current >= 10) {
      comboRef.current = 0;
      setComboTotal((c) => c + 1);
      setIsBackflip(true);
      setShowCombo(true);
      setDisplayMsg("BACKFLIP! 🤸");
      setTimeout(() => setIsBackflip(false), 800);
      setTimeout(() => setShowCombo(false), 2200);
      setTimeout(() => setDisplayMsg(message), 2400);
      return;
    }

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

  const isSad     = scoreReaction !== undefined && scoreReaction < 40;
  const isExcited = scoreReaction !== undefined && scoreReaction >= 80;
  const borderColor = isExcited ? "#FF8D3F" : isSad ? "#ef4444" : "#000";

  const tailPos  = side === "right" ? { right: 12, left: "auto" as const } : { left: 18, right: "auto" as const };
  const tailIPos = side === "right" ? { right: 14, left: "auto" as const } : { left: 20, right: "auto" as const };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={isStanding ? "Click me! (10× rapid = backflip)" : undefined}
      style={{
        position:      "fixed",
        zIndex:        9999,
        pointerEvents: isStanding ? "auto" : "none",
        cursor:        isDragging ? "grabbing" : isStanding ? "grab" : "default",
        display:       "flex",
        flexDirection: "column",
        alignItems:    side === "right" ? "flex-end" : "flex-start",
        userSelect:    "none",
        ...posStyle,
      }}
    >
      {/* ── COMBO badge ────────────────────────────────────── */}
      {showCombo && (
        <div style={{
          position:   "absolute",
          top:        -44,
          left:       "50%",
          background: "#FF8D3F",
          border:     "3px solid #000",
          boxShadow:  "3px 3px 0 #000",
          padding:    "4px 10px",
          fontFamily: "var(--app-font-heading)",
          fontWeight: 900,
          fontSize:   "0.75rem",
          whiteSpace: "nowrap",
          animation:  "combo-pop 0.4s ease-out forwards",
        }}>
          COMBO ×{comboTotal * 10}! 🎮
        </div>
      )}

      {/* ── Confetti particles ─────────────────────────────── */}
      {showConfetti && (
        <div style={{ position: "absolute", bottom: "100%", left: "50%", pointerEvents: "none" }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{
              position:     "absolute",
              width:        8,
              height:       8,
              background:   CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              border:       "1px solid #000",
              left:         (i % 2 === 0 ? -1 : 1) * (8 + i * 11),
              top:          0,
              borderRadius: i % 3 === 0 ? "50%" : 2,
              animation:    `confetti-fall 1.8s ${i * 0.07}s ease-in forwards`,
            }} />
          ))}
        </div>
      )}

      {/* ── Speech bubble ──────────────────────────────────── */}
      <div style={{
        marginBottom: 8,
        marginLeft:  side === "left"  ? 4 : 0,
        marginRight: side === "right" ? 4 : 0,
        display:     showBubble || phase === "exiting" ? "block" : "none",
        animation:   showBubble
          ? "greeter-bubble-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards"
          : "greeter-bubble-out 0.3s ease-in forwards",
      }}>
        <div style={{
          background:    "#fff",
          border:        `3px solid ${borderColor}`,
          boxShadow:     `3px 3px 0 ${borderColor}`,
          padding:       "8px 14px",
          fontFamily:    "var(--app-font-heading)",
          fontWeight:    900,
          fontSize:      "0.85rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          whiteSpace:    "nowrap",
          position:      "relative",
        }}>
          {displayMsg}
          <div style={{ position:"absolute", bottom:-10, ...tailPos,  width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", borderTop:`10px solid ${borderColor}` }} />
          <div style={{ position:"absolute", bottom:-6,  ...tailIPos, width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderTop:"7px solid #fff" }} />
        </div>
      </div>

      {/* ── Stick figure ───────────────────────────────────── */}
      <div style={figStyle}>
        <svg
          viewBox="0 0 64 108"
          width="72"
          height="121"
          overflow="visible"
          style={side === "right" ? { transform: "scaleX(-1)" } : undefined}
        >
          <ellipse cx="32" cy="104" rx="14" ry="4" fill="#00000018" />

          {/* ── Hat ── */}
          {hat === "hard" && <>
            <ellipse cx="32" cy="4" rx="21" ry="5.5" fill="#FFD700" stroke="#000" strokeWidth="2"/>
            <rect x="21" y="-1" width="22" height="8" rx="2" fill="#FFD700" stroke="#000" strokeWidth="2"/>
          </>}
          {hat === "grad" && <>
            <rect x="19" y="-6" width="26" height="6" fill="#111"/>
            <line x1="32" y1="-6" x2="32" y2="-13" stroke="#111" strokeWidth="2"/>
            <circle cx="32" cy="-14" r="2.5" fill="#FF8D3F"/>
            <line x1="19" y1="-3" x2="12" y2="3" stroke="#111" strokeWidth="1.5"/>
            <circle cx="11" cy="4" r="2" fill="#FF8D3F"/>
          </>}
          {hat === "party" && <>
            <path d="M32 -16 L19 4 L45 4 Z" fill="#FF8D3F" stroke="#000" strokeWidth="1.5"/>
            <circle cx="25" cy="-1" r="2" fill="#fff"/>
            <circle cx="37" cy="-4" r="2" fill="#fff"/>
            <circle cx="30" cy="-9" r="2" fill="#fff"/>
            <line x1="32" y1="-16" x2="32" y2="-22" stroke="#FFD700" strokeWidth="2"/>
            <circle cx="32" cy="-23" r="2.5" fill="#FFD700"/>
          </>}
          {hat === "sleep" && <>
            <path d="M32 2 L23 -19 Q28 -27 37 -19 Z" fill="#7777cc" stroke="#000" strokeWidth="1.5"/>
            <circle cx="23" cy="-19" r="4.5" fill="#fff" stroke="#000" strokeWidth="1.5"/>
            <text x="42" y="-6"  fontSize="8" fill="#7777cc" fontStyle="italic">z</text>
            <text x="49" y="-14" fontSize="6" fill="#7777cc" fontStyle="italic">z</text>
          </>}

          {/* Head */}
          <circle cx="32" cy="14" r="12" fill="#FF8D3F" stroke="#000" strokeWidth="2.5" />

          {/* Eyes */}
          {isExcited ? <>
            <text x="25" y="15" fontSize="9" textAnchor="middle" fill="#000">★</text>
            <text x="39" y="15" fontSize="9" textAnchor="middle" fill="#000">★</text>
          </> : <>
            <circle cx="28" cy="12" r="1.8" fill="#000" />
            <circle cx="36" cy="12" r="1.8" fill="#000" />
          </>}

          {/* Mouth */}
          {isSad
            ? <path d="M27 21 Q32 17 37 21" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            : <path d="M27 18 Q32 22 37 18" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />}

          {/* Hair */}
          <line x1="28" y1="3"  x2="26" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="2"  x2="32" y2="-1" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="3"  x2="38" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />

          {/* Body */}
          <line x1="32" y1="26" x2="32" y2="64" stroke="#000" strokeWidth="3" strokeLinecap="round" />

          {/* Left arm — laptop */}
          <g style={armStyle("l", "32px 36px")}>
            <line x1="32" y1="36" x2="13" y2="52" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
            <rect x="2" y="49" width="12" height="8" fill="#FF8D3F" stroke="#000" strokeWidth="1.8" />
            <line x1="2" y1="57" x2="14" y2="57" stroke="#000" strokeWidth="1.5" />
          </g>

          {/* Right arm */}
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

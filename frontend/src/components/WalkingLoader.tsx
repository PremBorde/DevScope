import { useEffect, useState } from "react";

const LOADER_MESSAGES = [
  "Cloning your repositories…",
  "Reading every README…",
  "Judging your commit messages…",
  "Calculating your dev score…",
  "Consulting Gemini AI…",
  "Weighing your star count…",
  "Checking your last commit date…",
  "Compiling the verdict…",
];

const PAGE_MESSAGES = [
  "Booting DevScope AI…",
  "Warming up the engines…",
  "Loading the good stuff…",
];

interface WalkingLoaderProps {
  username?: string;
}

export default function WalkingLoader({ username }: WalkingLoaderProps) {
  const messages = username ? LOADER_MESSAGES : PAGE_MESSAGES;
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setMsgIdx((i) => (i + 1) % messages.length),
      2400,
    );
    return () => clearInterval(t);
  }, [messages.length]);

  const armStyle = (dir: "l" | "r", origin: string): React.CSSProperties => ({
    transformOrigin: origin,
    animation: `walk-arm-${dir} 0.38s ease-in-out infinite alternate`,
  });

  const legStyle = (dir: "l" | "r", origin: string): React.CSSProperties => ({
    transformOrigin: origin,
    animation: `walk-leg-${dir} 0.38s ease-in-out infinite alternate`,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 select-none">

      {/* Title badge */}
      <div className="mb-14 text-center">
        <div className="inline-block border-4 border-black bg-black px-6 py-3 shadow-[6px_6px_0_#FF8D3F] -rotate-1">
          <span className="font-heading font-black text-2xl uppercase text-white tracking-tight">
            {username ? (
              <>Analyzing <span className="text-primary">@{username}</span></>
            ) : (
              <span className="text-primary">DevScope AI</span>
            )}
          </span>
        </div>
      </div>

      {/* Stage */}
      <div className="w-full max-w-md">

        {/* Walking track */}
        <div className="relative h-36 overflow-hidden border-4 border-black border-b-0 bg-white shadow-[6px_0_0_#000,-6px_0_0_#000]">

          {/* Scrolling ground dots */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black" />
          <div
            className="absolute bottom-2 left-0 right-0 h-px"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg,#00000030 0,#00000030 8px,transparent 8px,transparent 16px)",
              animation: "walk-ground 0.38s linear infinite",
            }}
          />

          {/* The walking figure */}
          <div
            className="absolute"
            style={{
              bottom: 4,
              left: "50%",
              transform: "translateX(-50%)",
              animation: "walk-bob 0.38s ease-in-out infinite alternate",
            }}
          >
            <svg viewBox="0 0 64 108" width="64" height="108" overflow="visible">
              {/* Shadow */}
              <ellipse cx="32" cy="104" rx="14" ry="4" fill="#00000018" />

              {/* Head */}
              <circle cx="32" cy="14" r="12" fill="#FF8D3F" stroke="#000" strokeWidth="2.5" />
              {/* Eyes */}
              <circle cx="28" cy="12" r="1.8" fill="#000" />
              <circle cx="36" cy="12" r="1.8" fill="#000" />
              {/* Smile */}
              <path d="M27 18 Q32 22 37 18" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              {/* Hair spikes */}
              <line x1="28" y1="3"  x2="26" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />
              <line x1="32" y1="2"  x2="32" y2="-1" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="3"  x2="38" y2="0"  stroke="#000" strokeWidth="2" strokeLinecap="round" />

              {/* Body */}
              <line x1="32" y1="26" x2="32" y2="64" stroke="#000" strokeWidth="3" strokeLinecap="round" />

              {/* Left arm */}
              <g style={armStyle("l", "32px 36px")}>
                <line x1="32" y1="36" x2="13" y2="52" stroke="#000" strokeWidth="2.8" strokeLinecap="round" />
                {/* Laptop */}
                <rect x="2" y="49" width="12" height="8" rx="0" fill="#FF8D3F" stroke="#000" strokeWidth="1.8" />
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

        {/* Ground strip */}
        <div className="border-4 border-t-0 border-black h-4 bg-black" />

        {/* Progress bar */}
        <div className="mt-5 border-4 border-black h-7 bg-white overflow-hidden shadow-[4px_4px_0_#000] relative">
          <div
            className="h-full bg-primary absolute left-0 top-0"
            style={{ animation: "walk-progress 15s cubic-bezier(0.4,0,0.6,1) forwards" }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "repeating-linear-gradient(-45deg,#000 0,#000 4px,transparent 4px,transparent 12px)",
            }}
          />
        </div>

        {/* Cycling message */}
        <div className="mt-6 text-center h-8 overflow-hidden">
          <p
            key={msgIdx}
            className="font-heading font-black text-base uppercase tracking-wide"
            style={{ animation: "loader-msg 2.4s ease forwards" }}
          >
            {messages[msgIdx]}
          </p>
        </div>

        {/* Sub-label */}
        <p className="text-center text-sm font-medium text-muted-foreground mt-2">
          {username ? "This usually takes 10–20 seconds" : "Just a moment…"}
        </p>
      </div>
    </div>
  );
}

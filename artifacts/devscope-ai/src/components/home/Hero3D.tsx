import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Sphere } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 50;
const MAX_EDGE_DIST = 2.8;

function Network() {
  const group = useRef<THREE.Group>(null);
  // Throttle: skip frames to target ~30 fps in the background scene
  const lastT = useRef(0);

  const nodes = useMemo(() => {
    const palette = ["#000000", "#FF8D3F", "#FFFFFF", "#000000", "#FF8D3F"];
    return Array.from({ length: NODE_COUNT }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      const r     = 3.5 + Math.random() * 2;
      return {
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ] as [number, number, number],
        color: palette[i % palette.length],
        size: 0.06 + Math.random() * 0.16,
      };
    });
  }, []);

  // Pre-compute edges once — N² loop runs only at mount
  const lines = useMemo(() => {
    const temp: [[number, number, number], [number, number, number]][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const p1 = new THREE.Vector3(...nodes[i].position);
        const p2 = new THREE.Vector3(...nodes[j].position);
        if (p1.distanceTo(p2) < MAX_EDGE_DIST) {
          temp.push([nodes[i].position, nodes[j].position]);
        }
      }
    }
    return temp;
  }, [nodes]);

  useFrame((state) => {
    if (!group.current) return;
    // ~30 fps cap — halves GPU work; imperceptible for a slow background rotation
    const now = state.clock.elapsedTime;
    if (now - lastT.current < 1 / 30) return;
    lastT.current = now;

    group.current.rotation.y += 0.0015;
    group.current.rotation.x = Math.sin(now * 0.15) * 0.12;
  });

  return (
    <group ref={group}>
      {lines.map((line, i) => (
        <Line key={i} points={line} color="#000000" lineWidth={1} transparent opacity={0.18} />
      ))}
      {nodes.map((node, i) => (
        // 8 sphere segments — half the vertex count, no visible quality loss
        <Sphere key={i} position={node.position} args={[node.size, 8, 8]}>
          <meshBasicMaterial color={node.color} />
        </Sphere>
      ))}
    </group>
  );
}

interface NodeDef {
  cx: number; cy: number; r: number; fill: string;
  dx: number; dy: number; dur: number; begin: number;
}

function CssFallback() {
  const { nodes, lines } = useMemo(() => {
    const palette = ["#FF8D3F", "#111111", "#FF8D3F", "#FFFFFF", "#111111", "#FF8D3F", "#111111"];
    const ns: NodeDef[] = Array.from({ length: 52 }, (_, i) => ({
      cx: 4 + Math.random() * 92,
      cy: 4 + Math.random() * 92,
      r:  1.2 + Math.random() * 3.2,
      fill: palette[i % palette.length],
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      dur:   5 + Math.random() * 6,
      begin: Math.random() * 4,
    }));
    const ls: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[i].cx - ns[j].cx;
        const dy = ns[i].cy - ns[j].cy;
        if (Math.sqrt(dx * dx + dy * dy) < 16) {
          ls.push({ x1: ns[i].cx, y1: ns[i].cy, x2: ns[j].cx, y2: ns[j].cy, key: `${i}-${j}` });
        }
      }
    }
    return { nodes: ns, lines: ls };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#FFF8E6" }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {lines.map((l) => (
          <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#00000020" strokeWidth="0.25" />
        ))}
        {nodes.map((n, i) => {
          const opacity = n.fill === "#FFFFFF" ? 0.55 : 0.82;
          return (
            <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} stroke="#00000040" strokeWidth="0.2" opacity={opacity}>
              <animate attributeName="cx" values={`${n.cx};${n.cx + n.dx};${n.cx}`}
                dur={`${n.dur}s`} begin={`${n.begin}s`} repeatCount="indefinite"
                calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" />
              <animate attributeName="cy" values={`${n.cy};${n.cy + n.dy};${n.cy}`}
                dur={`${n.dur}s`} begin={`${n.begin}s`} repeatCount="indefinite"
                calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" />
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    canvas.remove();
    return !!gl;
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const webGlAvailable = checkWebGL();
  const containerRef = useRef<HTMLDivElement>(null);

  // Pause the WebGL render loop when the hero section is scrolled off-screen.
  // When paused, the GPU is completely freed — no rAF callbacks, no draw calls.
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !webGlAvailable) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [webGlAvailable]);

  if (!webGlAvailable) {
    return <CssFallback />;
  }

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      <Canvas
        // "never" when off-screen: zero GPU cost while scrolled away
        frameloop={inView ? "always" : "never"}
        // Cap DPR at 1.5 — halves pixel fill rate on Retina without visible loss
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 45 }}
        fallback={<CssFallback />}
      >
        <color attach="background" args={["#FFF8E6"]} />
        <ambientLight intensity={0.6} />
        <Network />
      </Canvas>
    </div>
  );
}

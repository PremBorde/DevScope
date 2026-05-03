import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Sphere } from "@react-three/drei";
import * as THREE from "three";

function Network() {
  const group = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 70; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 3.5 + Math.random() * 2;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const palette = ["#000000", "#FF8D3F", "#FFFFFF", "#000000", "#FF8D3F"];
      const color = palette[Math.floor(Math.random() * palette.length)];
      const size = 0.06 + Math.random() * 0.16;
      temp.push({ position: [x, y, z] as [number, number, number], color, size });
    }
    return temp;
  }, []);

  const lines = useMemo(() => {
    const temp = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const p1 = new THREE.Vector3(...nodes[i].position);
        const p2 = new THREE.Vector3(...nodes[j].position);
        if (p1.distanceTo(p2) < 2.8) {
          temp.push([nodes[i].position, nodes[j].position]);
        }
      }
    }
    return temp;
  }, [nodes]);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.0015;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.12;
    }
  });

  return (
    <group ref={group}>
      {lines.map((line, i) => (
        <Line key={i} points={line} color="#000000" lineWidth={1} transparent opacity={0.18} />
      ))}
      {nodes.map((node, i) => (
        <Sphere key={i} position={node.position} args={[node.size, 16, 16]}>
          <meshBasicMaterial color={node.color} />
        </Sphere>
      ))}
    </group>
  );
}

interface NodeDef {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  dx: number;
  dy: number;
  dur: number;
  begin: number;
}

function CssFallback() {
  const { nodes, lines } = useMemo(() => {
    const palette = ["#FF8D3F", "#111111", "#FF8D3F", "#FFFFFF", "#111111", "#FF8D3F", "#111111"];
    const ns: NodeDef[] = Array.from({ length: 52 }, (_, i) => ({
      cx: 4 + Math.random() * 92,
      cy: 4 + Math.random() * 92,
      r: 1.2 + Math.random() * 3.2,
      fill: palette[i % palette.length],
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      dur: 5 + Math.random() * 6,
      begin: Math.random() * 4,
    }));

    const ls: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
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
        {/* Static connection lines */}
        {lines.map((l) => (
          <line
            key={l.key}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#00000020"
            strokeWidth="0.25"
          />
        ))}

        {/* Animated nodes */}
        {nodes.map((n, i) => {
          const x2 = n.cx + n.dx;
          const y2 = n.cy + n.dy;
          const opacity = n.fill === "#FFFFFF" ? 0.55 : 0.82;
          return (
            <circle
              key={i}
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill={n.fill}
              stroke="#00000040"
              strokeWidth="0.2"
              opacity={opacity}
            >
              <animate
                attributeName="cx"
                values={`${n.cx};${x2};${n.cx}`}
                dur={`${n.dur}s`}
                begin={`${n.begin}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
              />
              <animate
                attributeName="cy"
                values={`${n.cy};${y2};${n.cy}`}
                dur={`${n.dur}s`}
                begin={`${n.begin}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
              />
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
    return !!gl;
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const [webGlFailed, setWebGlFailed] = useState(() => !checkWebGL());

  useEffect(() => {
    if (!checkWebGL()) setWebGlFailed(true);
  }, []);

  if (webGlFailed) {
    return <CssFallback />;
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45 }}
      onCreated={({ gl }) => {
        if (!gl) setWebGlFailed(true);
      }}
      fallback={<CssFallback />}
    >
      <color attach="background" args={["#FFF8E6"]} />
      <ambientLight intensity={0.6} />
      <Network />
    </Canvas>
  );
}

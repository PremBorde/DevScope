import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Sphere } from "@react-three/drei";
import * as THREE from "three";

function Network() {
  const group = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 4 + Math.random() * 1.5;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const colors = ["#000000", "#FF8D3F", "#FFFFFF"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 0.05 + Math.random() * 0.15;
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
        if (p1.distanceTo(p2) < 2.5) {
          temp.push([nodes[i].position, nodes[j].position]);
        }
      }
    }
    return temp;
  }, [nodes]);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.002;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {lines.map((line, i) => (
        <Line key={i} points={line} color="#000000" lineWidth={1.5} transparent opacity={0.2} />
      ))}
      {nodes.map((node, i) => (
        <Sphere key={i} position={node.position} args={[node.size, 16, 16]}>
          <meshBasicMaterial color={node.color} />
        </Sphere>
      ))}
    </group>
  );
}

function CssFallback() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${Math.random() * 90 + 5}%`,
        top: `${Math.random() * 90 + 5}%`,
        size: 6 + Math.random() * 18,
        color: ["#FF8D3F", "#000", "#fff"][i % 3],
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#FFF8E6" }}>
      {nodes.map((n, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-black"
          style={{
            left: n.left,
            top: n.top,
            width: n.size,
            height: n.size,
            backgroundColor: n.color,
            animation: `float ${n.duration}s ease-in-out ${n.delay}s infinite alternate`,
            opacity: 0.7,
          }}
        />
      ))}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        {nodes.slice(0, 14).map((n, i) => {
          const next = nodes[(i + 3) % nodes.length];
          return (
            <line
              key={i}
              x1={n.left}
              y1={n.top}
              x2={next.left}
              y2={next.top}
              stroke="#000"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to { transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

export default function Hero3D() {
  const [webGlFailed, setWebGlFailed] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebGlFailed(true);
    } catch {
      setWebGlFailed(true);
    }
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
      <ambientLight intensity={0.5} />
      <Network />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}

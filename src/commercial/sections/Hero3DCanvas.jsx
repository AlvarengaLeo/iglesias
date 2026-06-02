// WebGL "community constellation" — warm glowing nodes (members) linked by light
// filaments (the church network = connect), slowly orbiting with mouse parallax.
// Lazy-loaded only on capable, motion-allowed, desktop-sized screens so three.js
// is never shipped to mobile / reduced-motion visitors.
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Float, Sparkles, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';

const GLOW = '#CFE0F7'; // pale steel-white node core
const CLAY = '#3A63E0'; // cobalt blue halos + filaments (the globe)

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Deterministic Fibonacci-sphere layout (no RNG → stable scene every load).
function fibSphere(n, r) {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const t = phi * i;
    pts.push([Math.cos(t) * rad * r, y * r * 0.82, Math.sin(t) * rad * r]);
  }
  return pts;
}

function Node({ position, seed }) {
  const ref = useRef();
  useFrame((s) => {
    const p = 0.82 + Math.sin(s.clock.elapsedTime * 1.3 + seed) * 0.2;
    if (ref.current) ref.current.scale.setScalar(p);
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color={CLAY} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Constellation() {
  const group = useRef();
  const { pointer } = useThree();
  const nodes = useMemo(() => fibSphere(30, 3.2), []);
  const links = useMemo(() => {
    const ls = [];
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: dist(a, b) }))
        .filter((x) => x.j !== i)
        .sort((p, q) => p.d - q.d)
        .slice(0, 2)
        .forEach(({ j }) => { if (j > i) ls.push([a, nodes[j]]); });
    });
    return ls;
  }, [nodes]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += dt * 0.06;
    const ty = -pointer.y * 0.22;
    g.rotation.x += (ty - g.rotation.x) * 0.04;
    g.position.x += (pointer.x * 0.35 - g.position.x) * 0.03;
  });

  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.4}>
      <group ref={group}>
        {links.map((l, i) => (
          <Line key={i} points={l} color={CLAY} lineWidth={0.7} transparent opacity={0.2} toneMapped={false} />
        ))}
        {nodes.map((p, i) => (
          <Node key={i} position={p} seed={i * 0.7} />
        ))}
      </group>
    </Float>
  );
}

export default function Hero3DCanvas({ mobile = false }) {
  return (
    <Canvas
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ position: [0, 0, 9], fov: 48 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.55} />
      <pointLight position={[6, 6, 8]} intensity={45} color="#CFE0FF" />
      <Constellation />
      <Sparkles count={55} scale={[13, 8, 6]} size={2} speed={0.25} color="#AFC8F0" opacity={0.5} />
    </Canvas>
  );
}

"use client";
import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Galaxy({ accent, accent2, count }: { accent: string; accent2: string; count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color(accent);
    const c2 = new THREE.Color(accent2);
    const branches = 4;
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * 9;
      const branch = ((i % branches) / branches) * Math.PI * 2;
      const spin = r * 0.55;
      const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.9 * (r * 0.25 + 0.2);
      positions[i * 3] = Math.cos(branch + spin) * r + rnd();
      positions[i * 3 + 1] = rnd() * 0.6;
      positions[i * 3 + 2] = Math.sin(branch + spin) * r + rnd();
      const mixed = c2.clone().lerp(c1, Math.min(1, r / 7));
      if (Math.random() < 0.12) mixed.set("#ffffff");
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }
    return { positions, colors };
  }, [accent, accent2, count]);

  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX / window.innerWidth - 0.5;
      mouse.current.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const scrollP = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
    ref.current.rotation.y += delta * 0.03;
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0.55 + mouse.current.y * 0.25 + scrollP * 0.6, 0.04);
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, mouse.current.x * 0.2, 0.04);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 9 - scrollP * 4, 0.05);
  });

  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.6)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <points ref={ref} position={[3.2, -0.6, -2.5]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial map={sprite} size={0.06} sizeAttenuation vertexColors depthWrite={false} blending={THREE.AdditiveBlending} transparent opacity={0.85} />
    </points>
  );
}

export default function GalaxyBackground({ accent, accent2 }: { accent: string; accent2: string }) {
  const [state, setState] = useState<{ count: number; demand: boolean } | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    setState({ count: small ? 5000 : 12000, demand: reduce });
  }, []);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const v = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // dim the galaxy once the visitor scrolls past the hero so content stays readable
    const onScroll = () => {
      const p = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
      if (wrap.current) wrap.current.style.opacity = String(0.75 - p * 0.45);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [state]);
  if (!state) return null;
  return (
    <div ref={wrap} aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2, 9], fov: 60 }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        frameloop={state.demand || !visible ? "demand" : "always"}
      >
        <Galaxy accent={accent} accent2={accent2} count={state.count} />
      </Canvas>
    </div>
  );
}

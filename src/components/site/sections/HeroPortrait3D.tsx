"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Image, Float, Sparkles, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * Interactive 3D portrait: a floating holographic card with your photo on the front
 * (and an optional second photo on the back). Drag / swipe to spin it; it eases back
 * to a gentle idle sway when released.
 */
function Card({ front, back, accent, accent2 }: { front: string; back: string; accent: string; accent2: string }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; lastX: number; lastY: number; vy: number }>({ active: false, lastX: 0, lastY: 0, vy: 0 });
  const spin = useRef(0);
  const { gl, size } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { active: true, lastX: e.clientX, lastY: e.clientY, vy: 0 };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      target.current.x = ((e.clientY - rect.top) / rect.height - 0.5) * 0.5;
      if (!drag.current.active) {
        target.current.y = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
        return;
      }
      const dx = e.clientX - drag.current.lastX;
      drag.current.lastX = e.clientX;
      drag.current.vy = dx * 0.012;
      spin.current += dx * 0.012;
    };
    const up = (e: PointerEvent) => {
      drag.current.active = false;
      el.style.cursor = "grab";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };
    const leave = () => {
      target.current = { x: 0, y: 0 };
    };
    el.style.cursor = "grab";
    el.style.touchAction = "pan-y";
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (!drag.current.active) {
      // inertia, then snap to nearest face (front/back)
      drag.current.vy *= 0.94;
      spin.current += drag.current.vy;
      if (Math.abs(drag.current.vy) < 0.002) {
        const nearest = Math.round(spin.current / Math.PI) * Math.PI;
        spin.current = THREE.MathUtils.lerp(spin.current, nearest, 0.06);
      }
    }
    const t = state.clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, spin.current + target.current.y + Math.sin(t * 0.6) * 0.06, 0.12);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, target.current.x, 0.08);
    void delta;
  });

  const scale = size.width < 500 ? 0.82 : 1;
  const W = 2.4;
  const H = 3.0;

  return (
    <group ref={group} scale={scale}>
      {/* card body */}
      <RoundedBox args={[W + 0.12, H + 0.12, 0.06]} radius={0.12} smoothness={6}>
        <meshStandardMaterial color="#0d0b1d" metalness={0.8} roughness={0.25} emissive={accent} emissiveIntensity={0.18} />
      </RoundedBox>
      <Image url={front} position={[0, 0, 0.035]} scale={[W, H]} radius={0.1} transparent toneMapped={false} />
      <Image url={back || front} position={[0, 0, -0.035]} rotation={[0, Math.PI, 0]} scale={[W, H]} radius={0.1} transparent toneMapped={false} />
    </group>
  );
}

function Rings({ accent, accent2 }: { accent: string; accent2: string }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (a.current) a.current.rotation.z += d * 0.25;
    if (b.current) b.current.rotation.z -= d * 0.18;
  });
  return (
    <group rotation={[1.25, 0, 0]} position={[0, -0.2, 0]}>
      <mesh ref={a}>
        <torusGeometry args={[2.35, 0.012, 16, 160]} />
        <meshBasicMaterial color={accent2} transparent opacity={0.7} />
      </mesh>
      <mesh ref={b} scale={1.18}>
        <torusGeometry args={[2.35, 0.006, 16, 160]} />
        <meshBasicMaterial color={accent} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function Shards({ accent, accent2 }: { accent: string; accent2: string }) {
  const items = [
    { p: [-2.3, 1.4, -0.6], s: 0.22, c: accent },
    { p: [2.2, -1.2, -0.3], s: 0.28, c: accent2 },
    { p: [2.0, 1.7, -1.0], s: 0.14, c: accent2 },
    { p: [-2.0, -1.6, 0.2], s: 0.16, c: accent },
  ] as const;
  return (
    <>
      {items.map((it, i) => (
        <Float key={i} speed={1.5 + i * 0.3} rotationIntensity={2} floatIntensity={1.5}>
          <mesh position={it.p as unknown as [number, number, number]} scale={it.s}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={it.c} wireframe emissive={it.c} emissiveIntensity={0.6} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export default function HeroPortrait3D({ front, back, accent, accent2, alt }: { front: string; back: string; accent: string; accent2: string; alt: string }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return (
    <div className="relative size-full" role="img" aria-label={`${alt} — interactive 3D card. Drag to rotate.`}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 6.2], fov: 45 }} frameloop={reduce ? "demand" : "always"} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 5]} intensity={40} color={accent2} />
        <pointLight position={[-4, -3, 4]} intensity={30} color={accent} />
        <Suspense fallback={null}>
          <Float speed={reduce ? 0 : 1.6} rotationIntensity={0.15} floatIntensity={0.6}>
            <Card front={front} back={back} accent={accent} accent2={accent2} />
          </Float>
        </Suspense>
        <Rings accent={accent} accent2={accent2} />
        <Shards accent={accent} accent2={accent2} />
        <Sparkles count={60} scale={[6, 6, 3]} size={2.5} speed={0.4} color={accent2} />
      </Canvas>
    </div>
  );
}

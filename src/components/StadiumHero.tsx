"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function Ball() {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    if (outer.current) {
      outer.current.rotation.y = t * 0.18 + pointer.x * 0.4;
      outer.current.rotation.x = Math.sin(t * 0.12) * 0.25 + pointer.y * 0.25;
    }
    if (inner.current) {
      const s = 1 + Math.sin(t * 1.4) * 0.03;
      inner.current.scale.setScalar(s);
    }
  });
  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.6}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial color="#c6ff00" wireframe transparent opacity={0.5} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.55, 2]} />
        <meshStandardMaterial
          color="#0e1510"
          emissive="#c6ff00"
          emissiveIntensity={0.22}
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>
    </Float>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    // deterministic scatter — no Math.random so SSR/CSR stay consistent
    const n = 420;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399963; // golden angle
      const r = 3.2 + (i % 47) * 0.16;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = ((i * 37) % 100) / 8 - 6;
      arr[i * 3 + 2] = Math.sin(a) * r - 2;
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.015;
      ref.current.position.y = (clock.getElapsedTime() * 0.12) % 1.2;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#9ac70a"
        size={0.035}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
}

export default function StadiumHero() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      dpr={[1, 1.75]}
      className="!absolute inset-0"
    >
      <fog attach="fog" args={["#070b08", 6, 14]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 4]} intensity={1.4} color="#e8f0e6" />
      <pointLight position={[0, -3, 3]} intensity={0.6} color="#c6ff00" />
      <Ball />
      <Dust />
    </Canvas>
  );
}

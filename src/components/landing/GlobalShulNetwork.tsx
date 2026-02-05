import React, { useRef, useMemo, Suspense, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Stars, Sparkles, Html } from "@react-three/drei";
import { Church, Users } from "lucide-react";
import * as THREE from "three";

// --- THE LIGHT THEMED PREMIUM SHADER (Curved Horizon) ---
const LIGHT_GRID_VERTEX = `
  varying vec2 vUv;
  varying float vFade;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vec4 viewPos = viewMatrix * worldPos; 
    
    float dist = length(viewPos.xz);
    
    // PRECISION GLOBE CURVATURE
    float curvature = 0.00055; 
    worldPos.y -= dist * dist * curvature;
    
    // FOG FADE
    vFade = max(0.0, 1.0 - dist * 0.008); 
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const LIGHT_GRID_FRAGMENT = `
  varying vec2 vUv;
  varying float vFade;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uColor;
  
  void main() {
    float gridScale = 30.0;
    // Sync grid movement with scroll
    vec2 gridUV = vec2(vUv.x * gridScale, vUv.y * gridScale * 15.0 - (uScroll * 2.0));
    vec2 cell = fract(gridUV); 
    
    float line = step(0.98, cell.x) + step(0.98, cell.y);
    float dash = step(0.4, mod(gridUV.y * 1.5 + uTime * 0.4, 1.0));
    float finalLine = max(step(0.98, cell.x) * 0.4, step(0.98, cell.y) * dash);
    
    if (finalLine * vFade < 0.01) discard; 
    
    gl_FragColor = vec4(uColor, finalLine * vFade * 0.7); // High contrast sharp lines
  }
`;

// --- DRONE CAMERA ---
function FlightDrone() {
    const { camera } = useThree();
    const currentZ = useRef(20);

    useFrame(() => {
        // DIRECT WINDOW SCROLL - Most responsive for Three.js
        const scrollVal = window.pageYOffset || document.documentElement.scrollTop;

        // Immediate responsiveness factor (0.25) to eliminate any delay feel
        const targetZ = 20 - (scrollVal * 0.1);
        currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, 0.25);

        camera.position.z = currentZ.current;
        camera.position.y = 8;

        // Target focus point moves with Z to maintain perspective
        camera.lookAt(0, 4, currentZ.current - 120);

        // Subtle banking roll based on scroll velocity (simulated via scroll delta)
        const roll = Math.sin(scrollVal * 0.0005) * 0.08;
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, roll, 0.05);
    });
    return null;
}

// --- ENTITIES ---
function ThemedEntity({ index }: { index: number }) {
    const isShul = index % 8 === 0;
    // UPDATED COLORS: Cyber Gold (#facc15) and Deep Navy Blue (#1e3a8a)
    const color = isShul ? "#facc15" : "#1e3a8a";
    const label = isShul ? "SHUL GENIUS" : "COMMUNITY HUB";

    const xPos = useMemo(() => (Math.sin(index * 321.123) * 120), [index]);
    const zBase = -index * 45;
    const worldLength = 45 * 40;

    const [randomOffset] = useState(() => Math.random() * 100);
    const meshRef = useRef<THREE.Group>(null);
    const scaleRef = useRef(1);

    useFrame((state) => {
        if (!meshRef.current) return;
        const camZ = state.camera.position.z;
        const time = state.clock.getElapsedTime();

        let relZ = zBase;
        while (relZ > camZ + 30) relZ -= worldLength;
        while (relZ < camZ - worldLength + 30) relZ += worldLength;

        const d = Math.abs(relZ - camZ);
        const drop = (d * d) * 0.00055 + (xPos * xPos) * 0.00055;

        // DYNAMIC ANIMATION: Multi-axis bobbing + Scale pulse
        const bob = Math.sin(time * 1.5 + randomOffset) * 0.8;
        const swing = Math.cos(time * 0.8 + randomOffset) * 0.4;
        const pulse = 1 + Math.sin(time * 2 + randomOffset) * 0.05;

        meshRef.current.position.set(xPos + swing, -8 - drop + 4 + bob, relZ);
        meshRef.current.scale.setScalar(pulse);
    });

    return (
        <group ref={meshRef}>
            <Billboard>
                {/* Visual Glow */}
                <mesh>
                    <circleGeometry args={[3, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.12} />
                </mesh>
                {/* Core Point */}
                <mesh position={[0, 0, 0.01]}>
                    <circleGeometry args={[1.6, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.9} />
                </mesh>

                <Html transform position={[0, 4.5, 0.2]} distanceFactor={18}>
                    <div className="flex flex-col items-center gap-2 pointer-events-none select-none opacity-95 scale-75 md:scale-100">
                        <div className={`${isShul ? 'bg-yellow-100/40 backdrop-blur-sm shadow-xl' : 'bg-blue-100/40 backdrop-blur-sm'} p-3 rounded-full border ${isShul ? 'border-yellow-400/50' : 'border-blue-500/30'}`}>
                            {isShul ? <Church className="w-8 h-8 text-yellow-600" /> : <Users className="w-6 h-6 text-blue-700" />}
                        </div>
                        <span className={`text-[10px] font-black tracking-widest uppercase ${isShul ? 'text-yellow-900' : 'text-blue-900'} bg-white/80 px-2 py-0.5 rounded backdrop-blur-md border border-stone-200`}>
                            {label}
                        </span>
                    </div>
                </Html>
            </Billboard>
        </group>
    );
}

function WorldFloor() {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderParams = useMemo(() => ({
        vertexShader: LIGHT_GRID_VERTEX,
        fragmentShader: LIGHT_GRID_FRAGMENT,
        uniforms: {
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uColor: { value: new THREE.Color("#facc15") } // CYBER GOLD
        }
    }), []);

    useFrame((state) => {
        const scrollVal = window.pageYOffset || document.documentElement.scrollTop;
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uScroll.value = scrollVal;
        }
        if (meshRef.current) {
            meshRef.current.position.z = state.camera.position.z - 100;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, 0]}>
            <planeGeometry args={[1000, 2000, 48, 48]} />
            <shaderMaterial
                ref={materialRef}
                {...shaderParams}
                transparent
                side={THREE.DoubleSide}
                precision="highp"
            />
        </mesh>
    );
}

// --- MAIN WRAPPER ---
export default function GlobalShulNetwork() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#FAFAF9]">
            {/* Soft atmospheric gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-50/20 via-transparent to-stone-50/80 pointer-events-none" />
        </div>
    );
}

export { GlobalShulNetwork };

import type { CameraMode, DiegeticTelemetry } from '../types/thermodynamics';

interface VisorOverlayProps {
  telemetry: DiegeticTelemetry;
  cameraMode: CameraMode;
}

/**
 * Pure Diegetic Optical Helmet Visor Overlay (ZERO digital bars, ZERO numeric HUD).
 * All thermodynamic conditions manifest physically on the curved visor glass:
 * - Extreme Cold (< 160 K): Crystalline ice dendrites crystallizing from corners
 * - Overheat (> 360 K): Internal steam condensation fogging & thermal shimmer
 * - Suit Stress (< 0.7 integrity): Physical hairline visor glass micro-fractures
 * - Meissner Flux-Pinning: Peripheral superconducting field streaks
 */
export function VisorOverlay({ telemetry, cameraMode }: VisorOverlayProps) {
  if (cameraMode !== 'first-person') {
    return null;
  }

  const frostIntensity = Math.max(0, Math.min(1, (165 - telemetry.suitKelvin) / 145));
  const heatFogIntensity = Math.max(0, Math.min(1, (telemetry.suitKelvin - 355) / 210));
  const crackIntensity = Math.max(0, Math.min(1, (0.78 - telemetry.integrity) / 0.65));
  const becIntensity = Math.max(0, Math.min(1, (1.0 - telemetry.timeDilation) * 2.2));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Curved Optical Visor Perimeter Frame */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 90px rgba(3, 7, 14, 0.78)',
        }}
      />

      {/* Cryogenic Frost Dendrites growing inward from corners when cold (< 165 K) */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: frostIntensity,
          background:
            'radial-gradient(circle at 50% 50%, transparent 52%, rgba(165, 243, 252, 0.16) 78%, rgba(224, 242, 254, 0.42) 100%)',
        }}
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g stroke="rgba(224, 242, 254, 0.62)" strokeWidth="1.4" fill="none">
            {/* Top-left frost dendrites */}
            <path d="M0,0 L145,110 M60,46 L115,32 M95,72 L78,132 M38,28 L22,95 M115,88 L175,92" />
            {/* Top-right frost dendrites */}
            <path d="M1440,0 L1295,110 M1380,46 L1325,32 M1345,72 L1362,132 M1402,28 L1418,95 M1325,88 L1265,92" />
            {/* Bottom-left frost dendrites */}
            <path d="M0,900 L155,785 M65,852 L122,866 M102,824 L82,765 M36,872 L24,804" />
            {/* Bottom-right frost dendrites */}
            <path d="M1440,900 L1285,785 M1375,852 L1318,866 M1338,824 L1358,765 M1404,872 L1416,804" />
          </g>
        </svg>
      </div>

      {/* Overheat Internal Condensation & Thermal Shimmer (> 355 K) */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: heatFogIntensity,
          background:
            'radial-gradient(circle at 50% 50%, transparent 48%, rgba(251, 146, 60, 0.14) 76%, rgba(234, 88, 12, 0.34) 100%)',
        }}
      />

      {/* Bose-Einstein Quantum Wave-Function Edge Refraction (Katman 5) */}
      {becIntensity > 0.02 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: becIntensity * 0.65,
            background:
              'radial-gradient(circle at 50% 50%, transparent 56%, rgba(125, 211, 252, 0.18) 88%, rgba(186, 230, 253, 0.3) 100%)',
          }}
        />
      )}

      {/* Visor Glass Micro-Fracture Stress Lines (Integrity < 0.78) */}
      {crackIntensity > 0.02 && (
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ opacity: crackIntensity * 0.75 }}
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g stroke="rgba(241, 245, 249, 0.55)" strokeWidth="1.2" fill="none">
            <path d="M120,0 L165,88 L142,148 L190,192" />
            <path d="M165,88 L224,96" />
            <path d="M1320,900 L1275,810 L1302,756 L1248,712" />
            <path d="M1275,810 L1218,805" />
          </g>
        </svg>
      )}

      {/* Meissner Flux-Pinning Peripheral Field Streaks */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          opacity: telemetry.meissnerActive ? 0.85 : 0,
          boxShadow: 'inset 0 0 70px rgba(56, 189, 248, 0.42)',
        }}
      />

      {/* Minimalist Optical Collimator Pinpoint (2px) */}
      {telemetry.isPointerLocked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1 w-1 rounded-full bg-sky-200/80 shadow-[0_0_6px_rgba(125,211,252,0.85)]" />
        </div>
      )}
    </div>
  );
}

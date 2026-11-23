import { useEffect, useRef, useState } from 'react';
import { AbsoluteZeroEngine } from './engine/AbsoluteZeroEngine';
import { CinemaDock } from './components/CinemaDock';
import { VisorOverlay } from './components/VisorOverlay';
import type { ArenaId, CameraMode, DiegeticTelemetry } from './types/thermodynamics';

const INITIAL_TELEMETRY: DiegeticTelemetry = {
  suitKelvin: 290,
  heliumReserve: 1.0,
  siphonHeatCharge: 0.28,
  integrity: 1.0,
  meissnerActive: false,
  timeDilation: 1.0,
  ambientKelvin: 77,
  enemiesRemaining: 4,
  bossKelvin: null,
  shatteredCount: 0,
  isPointerLocked: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AbsoluteZeroEngine | null>(null);

  const [activeArena, setActiveArena] = useState<ArenaId>('cryo-cascades');
  const [cameraMode, setCameraMode] = useState<CameraMode>('first-person');
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [telemetry, setTelemetry] = useState<DiegeticTelemetry>(INITIAL_TELEMETRY);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new AbsoluteZeroEngine(
      mountEl,
      (nextTelemetry) => setTelemetry(nextTelemetry),
      (lost) => setContextLost(lost)
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, ArenaId> = {
        Digit1: 'cryo-cascades',
        Digit2: 'maglev-chasm',
        Digit3: 'superfluid-vaults',
        Digit4: 'thermal-runaway',
        Digit5: 'bose-einstein-throne',
      };
      const target = map[e.code];
      if (target) {
        setActiveArena(target);
        engineRef.current?.loadArena(target);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSelectArena = (id: ArenaId) => {
    setActiveArena(id);
    engineRef.current?.loadArena(id);
  };

  const handleChangeCameraMode = (mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  };

  const handleEnterCombat = () => {
    if (cameraMode !== 'first-person') {
      setCameraMode('first-person');
      engineRef.current?.setCameraMode('first-person');
    }
    engineRef.current?.requestPointerLock();
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    const isNowMuted = engineRef.current.toggleMute();
    setMuted(isNowMuted);
  };

  const handleResetArena = () => {
    engineRef.current?.resetArena();
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#05080d]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 h-full w-full"
        aria-label="Absolute Zero 3D Termodinamik Savaş Alanı"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080d]/95 p-6 text-center">
          <div className="max-w-md border border-white/15 bg-[#0b1320] p-6">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Grafik Bağlamı Duraklatıldı
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              WebGL motoru yeniden başlatılıyor. Sayfayı yenileyerek termodinamik simülasyona devam edebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* Diegetic Optical Helmet Visor Overlay (Zero-UI during play) */}
      <VisorOverlay telemetry={telemetry} cameraMode={cameraMode} />

      {/* Collapsible Bottom Cinema & Arena Selector Dock (hidden automatically in pointer-locked combat) */}
      <CinemaDock
        activeArena={activeArena}
        cameraMode={cameraMode}
        isPointerLocked={telemetry.isPointerLocked}
        muted={muted}
        onSelectArena={handleSelectArena}
        onChangeCameraMode={handleChangeCameraMode}
        onEnterCombat={handleEnterCombat}
        onToggleMute={handleToggleMute}
        onResetArena={handleResetArena}
      />
    </main>
  );
}

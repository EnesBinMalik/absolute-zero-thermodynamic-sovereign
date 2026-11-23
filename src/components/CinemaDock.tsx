import { useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Eye, HelpCircle, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ARENAS, type ArenaId, type CameraMode } from '../types/thermodynamics';

interface CinemaDockProps {
  activeArena: ArenaId;
  cameraMode: CameraMode;
  isPointerLocked: boolean;
  muted: boolean;
  onSelectArena: (id: ArenaId) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onEnterCombat: () => void;
  onToggleMute: () => void;
  onResetArena: () => void;
}

export function CinemaDock({
  activeArena,
  cameraMode,
  isPointerLocked,
  muted,
  onSelectArena,
  onChangeCameraMode,
  onEnterCombat,
  onToggleMute,
  onResetArena,
}: CinemaDockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const currentSpec = ARENAS.find((a) => a.id === activeArena) ?? ARENAS[0];

  // During active pointer-locked First-Person Combat, uphold absolute Zero-UI!
  if (isPointerLocked && cameraMode === 'first-person') {
    return null;
  }

  return (
    <>
      {/* Editorial Title Anchor (visible only outside active pointer lock) */}
      <header className="pointer-events-none fixed left-6 top-5 z-20 max-w-md">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wider text-sky-300/80">
          <span>Enes Öztürk</span>
          <span aria-hidden="true">·</span>
          <span>Katman {currentSpec.index}: {currentSpec.titleTr}</span>
        </div>
        <h1 className="font-display mt-1 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
          Absolute Zero: The Thermodynamic Sovereign
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-300/80">
          {currentSpec.description}
        </p>
      </header>

      {/* Center Unobstructed Entry Call-to-Action when not pointer-locked in First-Person */}
      {cameraMode === 'first-person' && !isPointerLocked && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center">
          <button
            type="button"
            onClick={onEnterCombat}
            className="pointer-events-auto cursor-pointer border border-sky-300/40 bg-[#070d16]/85 px-6 py-3 text-sm font-medium tracking-wide text-slate-50 transition-colors hover:border-sky-300 hover:bg-[#0b1626]"
          >
            Savaşa Gir (Fare Kilitle · ESC ile Çık)
          </button>
        </div>
      )}

      {/* Collapsible Controls Legend Drawer */}
      {showGuide && !collapsed && (
        <div className="fixed bottom-24 left-1/2 z-30 w-[min(680px,92vw)] -translate-x-1/2 border border-white/15 bg-[#070c14]/95 p-4 text-xs text-slate-200 shadow-2xl">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <div>
              <span className="font-mono-tabular font-semibold text-sky-300">W A S D · Space</span>
              <div className="text-slate-400">Hareket ve Zıplama</div>
            </div>
            <div>
              <span className="font-mono-tabular font-semibold text-sky-300">Sol Tık</span>
              <div className="text-slate-400">Kelvin Kılıcı Darbesi</div>
            </div>
            <div>
              <span className="font-mono-tabular font-semibold text-orange-300">Sağ Tık (Basılı)</span>
              <div className="text-slate-400">Termo-Sifon Isı Emme</div>
            </div>
            <div>
              <span className="font-mono-tabular font-semibold text-sky-300">E (Basılı / Bas)</span>
              <div className="text-slate-400">-271°C Sıvı Helyum · Vana Aç</div>
            </div>
            <div>
              <span className="font-mono-tabular font-semibold text-orange-300">Q</span>
              <div className="text-slate-400">Süper-Kızgın Plazma Dalgası</div>
            </div>
            <div>
              <span className="font-mono-tabular font-semibold text-sky-300">Shift</span>
              <div className="text-slate-400">Meissner Manyetik Atılma</div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-slate-400">
            Diegetik Telemetri: Kılıç kabzasındaki cam tüp sıvı helyum seviyesini, sol eldivendeki 6 bakır kanat emilen plazma ısısını, kask vizörü ise ortam sıcaklığını gösterir.
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <div
        className={`fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center transition-transform duration-200 ${
          collapsed ? 'translate-y-[calc(100%-22px)]' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Kontrolleri Göster' : 'Kontrolleri Gizle'}
          className="flex cursor-pointer items-center gap-1.5 border border-b-0 border-white/15 bg-[#070c14]/92 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:text-white whitespace-nowrap shrink-0"
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{collapsed ? 'Kontrolleri Göster' : 'Sahneyi Temizle'}</span>
        </button>

        <nav
          aria-label="Arena ve Kamera Kontrolleri"
          className="flex max-w-[95vw] flex-wrap items-center justify-center gap-2 border border-white/15 bg-[#070c14]/92 px-3 py-2 shadow-2xl"
        >
          {/* 5 Handcrafted Thermodynamic Arenas */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            {ARENAS.map((arena) => {
              const active = arena.id === activeArena;
              return (
                <button
                  key={arena.id}
                  type="button"
                  onClick={() => onSelectArena(arena.id)}
                  className={`cursor-pointer px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/50'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  {arena.index}. {arena.titleTr.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Camera Mode Switch */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              type="button"
              onClick={() => onChangeCameraMode('first-person')}
              className={`flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'first-person'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Aksiyon</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCameraMode('orbit')}
              className={`flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                cameraMode === 'orbit'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>İnceleme</span>
            </button>
          </div>

          {/* Utility Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onResetArena}
              title="Arenayı Sıfırla"
              className="flex cursor-pointer items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Sıfırla</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
              className="flex cursor-pointer items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-white whitespace-nowrap shrink-0"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{muted ? 'Sessiz' : 'Ses'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGuide((g) => !g)}
              title="Kontroller"
              className={`flex cursor-pointer items-center gap-1 px-2.5 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 ${
                showGuide ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Tuşlar</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

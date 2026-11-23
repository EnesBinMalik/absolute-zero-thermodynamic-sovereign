export type ArenaId =
  | 'cryo-cascades'
  | 'maglev-chasm'
  | 'superfluid-vaults'
  | 'thermal-runaway'
  | 'bose-einstein-throne';

export type PhaseState =
  | 'BOSE_EINSTEIN'
  | 'BRITTLE_CRYSTAL'
  | 'SOLID_METAL'
  | 'SUPERFLUID'
  | 'MOLTEN_LIQUID'
  | 'PLASMA_GAS';

export type CameraMode = 'first-person' | 'orbit';

export interface ArenaSpec {
  id: ArenaId;
  index: number;
  titleTr: string;
  subtitleEn: string;
  ambientKelvin: number;
  gravityScale: number;
  friction: number;
  description: string;
  accentHex: string;
}

export const ARENAS: ArenaSpec[] = [
  {
    id: 'cryo-cascades',
    index: 1,
    titleTr: 'Sıvı Azot Çağlayanları',
    subtitleEn: 'The Cryo-Cascades',
    ambientKelvin: 77,
    gravityScale: 1.0,
    friction: 0.86,
    description:
      'Devasa bakır borulardan akan sıvı azot şelalelerinin aşırı ısınmış silikon işlemci kulelerine çarptığı dikey buhar katedrali.',
    accentHex: '#38bdf8',
  },
  {
    id: 'maglev-chasm',
    index: 2,
    titleTr: 'Manyetik Levitasyon Köprüleri',
    subtitleEn: 'The Maglev Chasm',
    ambientKelvin: 92,
    gravityScale: 0.85,
    friction: 0.88,
    description:
      'Fiziksel desteği olmayan dönen süperiletken halkalar ve anlık polarite değişimleriyle Meissner Etkisi uçuş meydanı.',
    accentHex: '#60a5fa',
  },
  {
    id: 'superfluid-vaults',
    index: 3,
    titleTr: 'Süperakışkan Helyum Labirenti',
    subtitleEn: 'The Superfluid Vaults',
    ambientKelvin: 2.17,
    gravityScale: 0.92,
    friction: 0.985,
    description:
      'Sıfır viskoziteli süperakışkan helyumun duvarlara tırmandığı, sürtünmesiz yüksek hız ve refleks mahzenleri.',
    accentHex: '#7dd3fc',
  },
  {
    id: 'thermal-runaway',
    index: 4,
    titleTr: 'Termal Kaçak Fırınları',
    subtitleEn: 'The Thermal Runaway Core',
    ambientKelvin: 640,
    gravityScale: 1.0,
    friction: 0.84,
    description:
      'Erimiş silikon havuzları ve kızıl bakır ısı emiciler arasında manuel kriyojenik vanaları açarak buz yolları kurduğunuz fırın çekirdeği.',
    accentHex: '#f97316',
  },
  {
    id: 'bose-einstein-throne',
    index: 5,
    titleTr: 'Mutlak Sıfır Çekirdeği',
    subtitleEn: 'The Bose-Einstein Condensate Throne',
    ambientKelvin: 0.08,
    gravityScale: 0.65,
    friction: 0.91,
    description:
      'Zamanın yavaşladığı Bose-Einstein yoğuşması tahtında Entropi Canavarı Heat-Death Leviathan ile nihai yüzleşme.',
    accentHex: '#a5f3fc',
  },
];

export interface DiegeticTelemetry {
  suitKelvin: number;        // 1K to 900K (ideal ~290K; <110K freezes visor, >430K fogs/steams visor)
  heliumReserve: number;     // 0..1 (visible inside Kelvin Sabre vacuum glass tube)
  siphonHeatCharge: number;  // 0..1 (drives Entropy Siphon gauntlet copper fins dark -> bright orange)
  integrity: number;         // 0..1 (diegetic visor hairline tension & acoustic pulse)
  meissnerActive: boolean;   // Flux-pinning levitation/dash active
  timeDilation: number;      // 1.0 normal, < 1.0 in Bose-Einstein waves
  ambientKelvin: number;
  enemiesRemaining: number;
  bossKelvin: number | null;
  shatteredCount: number;
  isPointerLocked: boolean;
}

export function kelvinToPhase(kelvin: number): PhaseState {
  if (kelvin <= 3) return 'BOSE_EINSTEIN';
  if (kelvin <= 95) return 'BRITTLE_CRYSTAL';
  if (kelvin <= 680) return 'SOLID_METAL';
  if (kelvin <= 1150) return 'MOLTEN_LIQUID';
  return 'PLASMA_GAS';
}

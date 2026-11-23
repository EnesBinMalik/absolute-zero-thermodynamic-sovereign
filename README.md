<div align="center">

<img src="docs/01-kapak.png" alt="Absolute Zero: The Thermodynamic Sovereign — Enes Öztürk imzalı 3B aksiyon deneyimi" width="100%">

# Absolute Zero: The Thermodynamic Sovereign

**Enes Öztürk imzalı, termodinamiğin yasalarını oynanabilir hale getiren 3B aksiyon deneyimi.**

[![Doğrulama](https://img.shields.io/badge/Do%C4%9Frulama-lint%20%2B%20build%20ge%C3%A7ti-2EA043?style=for-the-badge)](https://github.com/EnesBinMalik/absolute-zero-thermodynamic-sovereign)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.187-050505?logo=three.js&logoColor=white&style=for-the-badge)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vite.dev/)

[![Enes Öztürk](https://img.shields.io/badge/Enes%20%C3%96zt%C3%BCrk-imzal%C4%B1-EA4338?style=for-the-badge&logo=badge&logoColor=white)](https://github.com/EnesBinMalik)
[![Tür](https://img.shields.io/badge/T%C3%BCr-3B%20Aksiyon-38BDF8?style=for-the-badge)](https://github.com/EnesBinMalik/absolute-zero-thermodynamic-sovereign)
[![Durum](https://img.shields.io/badge/Durum-Tamamland%C4%B1-2EA043?style=for-the-badge)](https://github.com/EnesBinMalik/absolute-zero-thermodynamic-sovereign)
[![Lisans](https://img.shields.io/badge/Lisans-T%C3%BCm%20Haklar%20Sakl%C4%B1%C4%9F%C4%B1-6E7681?style=for-the-badge)](https://github.com/EnesBinMalik/absolute-zero-thermodynamic-sovereign)

<img src="docs/rozet-enes-ozturk.png" alt="Enes Öztürk imzalı tasarım rozeti" width="420">

</div>

---

## Hakkında

**Absolute Zero**, sıcaklık bir sayaç değil; bir silah, bir kalkan ve bir engel olduğu bir dünyada geçen birinci şahıs 3B aksiyon deneyimidir. Oyuncu, Kelvin Kılıcı ve Entropi Sifonu Eldiveni ile ortamın faz durumunu değiştirir; donmuş yüzeyleri kırar, süperiletken alanlarda süzülür ve ısıyı düşmanlarına geri yönlendirir.

Proje; fizik tabanlı hareket, gerçek zamanlı faz geçişleri, prosedürel arena mimarisi ve tamamen diegetik (dünya içi) bir arayüzü tek bir tarayıcı deneyiminde birleştirir. Harici bir oyun motoru kullanılmaz: tüm sahne, fizik ve kamera sistemi **Three.js** üzerinden sıfırdan kurulmuştur.

> Bu proje **Enes Öztürk** tarafından tasarlanmış, geliştirilmiş ve imzalanmıştır.

---

## Öne çıkan özellikler

| Özellik | Açıklama |
| --- | --- |
| **5 el yapımı arena** | 77 K kriyojenik şelalelerden 0,08 K Bose-Einstein tahtına kadar değişen fizik kuralları. |
| **Faz geçişi sistemi** | `kelvinToPhase()` ile 6 faz: Bose-Einstein, kırılgan kristal, katı metal, sıvı, ergimiş ve plazma. |
| **Kelvin Kılıcı** | Vakum cam tüp içindeki helyum rezervini tüketerek düşmanı anında donduran yakın dövüş silahı. |
| **Entropi Sifonu** | Düşmandan çekilen ısı, eldivenin bakır kanatlarında biriktirilip geri fırlatılabilir. |
| **Meissner akış tuzaklaması** | `Shift` ile süperiletken yüzeylerde manyetik levitasyon ve hızlı atılma. |
| **Diegetik telemetri** | Sıcaklık, bütünlük ve rezerv bilgileri HUD panelinde değil; vizör camı, kılıç tüpü ve eldiven kanatlarında gösterilir. |
| **Zaman genişlemesi** | Bose-Einstein dalgalarında `timeDilation < 1.0` ile yavaşlama etkisi. |
| **İki kamera modu** | Birinci şahıs savaş modu ve sinematik orbit/inceleme modu. |
| **Boss savaşı** | 5. arenada Entropi Canavarı *Heat-Death Leviathan* ile nihai yüzleşme. |
| **Yazılım GL yedeği** | WebGL donanım hızlandırması yoksa otomatik yazılım tabanlı görüntülemeye geçer. |

---

## Arenalar

| # | Arena | Ortam sıcaklığı | Yer çekimi | Sürtünme |
| --- | --- | --- | --- | --- |
| 01 | Sıvı Azot Çağlayanları — *The Cryo-Cascades* | 77 K | 1.00 | 0.86 |
| 02 | Manyetik Levitasyon Köprüleri — *The Maglev Chasm* | 92 K | 0.85 | 0.88 |
| 03 | Süperakışkan Helyum Labirenti — *The Superfluid Vaults* | 2.17 K | 0.92 | 0.985 |
| 04 | Termal Kaçak Fırınları — *The Thermal Runaway Core* | 640 K | 1.00 | 0.84 |
| 05 | Mutlak Sıfır Çekirdeği — *The Bose-Einstein Throne* | 0.08 K | 0.65 | 0.91 |

Her arena kendi yer çekimi, sürtünme, sis yoğunluğu ve vurgu rengiyle ayrı bir fizik deneyidir.

---

## Kontroller

| Tuş | Aksiyon |
| --- | --- |
| `W` `A` `S` `D` | Hareket |
| `Boşluk` | Zıplama |
| `Fare` / `Sürükle` | Bakış açısı |
| `Sol tık` | Kelvin Kılıcı darbesi |
| `Shift` | Meissner manyetik atılma |
| `1` – `5` | Arena seçimi |
| `ESC` | Fare kilidinden çıkış |
| `Sıfırla` | Aktif arenayı yeniden kurar |

> Savaş sırasında arayüz tamamen kaldırılır: ekranda yalnızca dünya içi telemetri kalır.

---

## Galeri

<img src="docs/02-termal-kacak.png" alt="Termal Kaçak Fırınları arenası" width="100%">

<img src="docs/03-entropi-boss.png" alt="Mutlak Sıfır Çekirdeği ve Entropi Canavarı" width="100%">

---

## Kurulum

**Gereksinimler:** Node.js 20+ ve modern bir WebGL tarayıcı.

```bash
git clone https://github.com/EnesBinMalik/absolute-zero-thermodynamic-sovereign.git
cd absolute-zero-thermodynamic-sovereign
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

> `.env.example` dosyası yalnızca AI Studio dağıtım şablonu içindir. Oyun tamamen istemci tarafında çalışır; yerel oynamak için API anahtarı gerekmez.

Diğer komutlar:

```bash
npm run build     # Üretim derlemesi (dist/)
npm run preview   # Derlemeyi yerelde önizle
npm run lint      # TypeScript tip kontrolü
```

---

## Teknik mimari

```text
src/
├── App.tsx                       Uygulama kabuğu, telemetri durumu, kamera modu
├── main.tsx                      React giriş noktası
├── engine/
│   └── AbsoluteZeroEngine.ts     Three.js sahnesi, fizik, düşman AI, silahlar, kamera
├── components/
│   ├── CinemaDock.tsx            Arena seçici, kontrol rehberi, ses ve sıfırlama
│   └── VisorOverlay.tsx          Diegetik vizör ve faz göstergeleri
├── types/
│   └── thermodynamics.ts         Arena, faz ve telemetri tipleri
└── styles.css                    Tailwind 4 ve özel tipler
```

Motor ve arayüz, `telemetry` durum nesnesi üzerinden tek yönlü bir köprüyle iletişim kurar. React yeniden render'ları oyun döngüsüne müdahale etmez; `requestAnimationFrame` döngüsü tamamen `AbsoluteZeroEngine` içinde yönetilir.

---

## İmza

<div align="center">

[![Enes Öztürk](https://img.shields.io/badge/Geli%C5%9Ftirici-Enes%20%C3%96zt%C3%BCrk-EA4338?style=for-the-badge&logo=github&logoColor=white)](https://github.com/EnesBinMalik)
[![İmza](https://img.shields.io/badge/%C4%B0mza-Enes%20%C3%96zt%C3%BCrk-FFD700?style=for-the-badge&logo=verified&logoColor=white)](https://github.com/EnesBinMalik)

**Bu kod, tasarım ve deneyim Enes Öztürk'ün kişisel imzasını taşır.**

© 2026 Enes Öztürk — Tüm hakları saklıdır.

</div>

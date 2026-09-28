# Camera body profiles

**Status: implemented as brand and model-inspired software profiles, not as exact camera JPEG emulation.** Checked against manufacturer pages on 2026-09-28. Body and feature names identify the examples represented in Stillframe; the rendered colour looks and sensor-noise response are original approximations. Camera makers' trademarks remain their respective owners'.

| Selectable profile | Sensor preset | Style family represented | Body-specific controls represented |
| --- | --- | --- | --- |
| Sony α7 IV | Full frame | Creative Look: ST, PT, NT, VV, FL, IN, SH, BW, SE | Soft Skin Effect; no dual-native-ISO selector |
| Canon EOS R6 Mark II | Full frame | Picture Style: Auto, Standard, Portrait, Landscape, Fine Detail, Neutral, Faithful, Monochrome | High ISO NR levels; no dual-native-ISO selector or skin-softening switch |
| Nikon Z 8 | Full frame | Picture Control: Standard, Neutral, Vivid, Flat, Portrait, Landscape, Monochrome, Deep Tone Monochrome | Skin softening; no dual-native-ISO selector |
| Fujifilm X-T5 | APS-C | Film Simulation: a representative subset including PROVIA, Velvia, ASTIA, CLASSIC CHROME, PRO Neg., ETERNA, ACROS, Classic Neg. | Smooth Skin Effect; no dual-native-ISO selector |
| Panasonic LUMIX S5IIX | Full frame | Photo Style: Standard, Vivid, Natural, L.ClassicNeo, L.Monochrome, Cinelike D2/V2, Like709 | Dual Native ISO (Normal photo profile: 100 / 640); no skin-softening switch |
| OM SYSTEM OM-3 | Micro Four Thirds | Picture Mode: i-Finish, Vivid, Natural, Portrait, Muted, Monotone, Colour Creator | Flash look controls are software effects; no dual-native-ISO or skin-softening switch |

The LUMIX S5IIX profile shows **100 / 640** only for its normal photo profile. Panasonic documents different native pairs for V-Log, HLG, and Cinelike profiles; those are not offered because Stillframe currently models still-photo colour looks rather than log-video capture. The Auto choice uses the 100 base below ISO 640 and the 640 base from ISO 640 upward. Low and High choices constrain the simulated ISO range to the body profile's documented normal-mode ranges.

High ISO NR levels are normalized to Off / Low / Standard / High so the shared controls remain legible across brands. They reduce the simulator's ISO grain and add a small image-softening blur; they do not reproduce proprietary sensor readout, multi-frame alignment, or each brand's JPEG pipeline. The soft-skin control is enabled only for the selected Sony α7 IV, Nikon Z 8, and Fujifilm X-T5 body profiles whose official specifications list a skin-softening feature. Its browser effect is a subtle whole-image softness approximation; it does not identify faces or selectively retouch skin.

Fill, slow-sync, and rear-curtain options draw a centered warm flash falloff in the preview and rendered capture. This shows the lighting concept, but does not model flash power, guide number, subject shadows, or a particular accessory's TTL behavior. The scene program selector recalls a starting exposure, tone look, or supported skin setting; users can continue adjusting every camera control afterward.

## Manufacturer references

- [Sony α7 IV specifications](https://www.sony.com/electronics/support/e-mount-body-ilce-7m4-series/ilce-7m4/specifications) list Creative Look and Soft Skin Effect.
- [Canon EOS R6 Mark II Picture Style manual](https://cam.start.canon/en/C012/manual/html/UG-04_Shooting-1_0230.html) and [High ISO speed NR manual](https://cam.start.canon/tc/C012/manual/html/UG-04_Shooting-1_0300.html) describe its image styles and noise-reduction levels.
- [Nikon Z 8 specifications](https://www.nikonusa.com/p/z-8/1698/overview) list Picture Controls and High ISO NR; Nikon also describes [Skin Softening](https://www.nikonusa.com/p/z-8/1695/overview).
- [Fujifilm X-T5 specifications](https://www.fujifilm-x.com/en-gb/products/cameras/x-t5/specifications/) list Film Simulation and Smooth Skin Effect.
- [Panasonic LUMIX S5IIX specifications](https://www.panasonic.com/au/consumer/lumix-cameras-video-cameras/lumix-cameras/lumix-s-cameras/dc-s5m2xgn.html) list the normal-mode ISO 100 / 640 native pair and other photo-style-dependent pairs.
- [OM SYSTEM OM-3 specifications](https://explore.omsystem.com/us/en/om-3) list Picture Modes and supported flash modes.

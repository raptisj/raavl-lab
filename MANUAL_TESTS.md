# Manual validation — not yet executed

Record date, OS/device/browser version, package SHA256, scenario URL, result, and any accessibility or playback issue. These are not inferred from Playwright results.

1. **Real Safari / iOS:** open vanilla playback and Next routes on an actual device using a deliberate local-network serving setup. Start with a user gesture; pause, seek, change rate, rotate the device, background/foreground it, lock/unlock, and navigate away/back. Confirm route-local audio stops while the persistent layout player survives intentional navigation. Report actual autoplay restrictions.
2. **Android:** repeat transport, annotation drag/resize, minimap navigation, pinch/page-scroll interaction and background playback. Verify focus is not stranded after deleting an annotation.
3. **Screen reader:** with VoiceOver and/or NVDA, navigate complete/composed controls, sliders, annotation list, locked items, selection and error outputs. Confirm useful names, values, keyboard focus, and no continuous clock announcements that overwhelm navigation.
4. **Labels and channel behavior:** use `Split channels`, drag a channel-specific region, scroll it offscreen/back, and verify label cleanup and retained document metadata. Test input methods beyond desktop mouse and emulated taps.
5. **Native policies:** try playback before any gesture, interrupted audio outputs, headphones and background timer throttling. Record policy-dependent behavior; do not treat best-effort range loops as sample-accurate.
6. **Extended performance:** capture React commit timings in the profiler, drag latency under dense annotations, heap reclamation after repeated owners, and full decode memory for genuinely long media. The automatic supplied-peak baseline does not cover these measurements.

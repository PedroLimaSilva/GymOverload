import { registerSW } from "virtual:pwa-register";

export function registerPWA(): void {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Optional: could show a toast; keep quiet for minimal UI.
    },
  });
}

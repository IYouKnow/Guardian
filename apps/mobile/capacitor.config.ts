import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.guardian.vault',
  appName: 'Guardian',
  webDir: 'dist',
  // Required for `cap run android --live-reload` to load `http://...` on Android.
  // Keep this enabled for development; production typically uses the bundled `dist/` files.
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: true,
        allowNavigation: ['*'],
      }
    : {
        cleartext: true,
        allowNavigation: ['*'],
      }
};

export default config;

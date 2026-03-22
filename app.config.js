/**
 * Configuração Expo. Usado no EAS Build para embutir EXPO_PUBLIC_* em extra,
 * garantindo que as variáveis dos EAS Secrets estejam disponíveis no app.
 * No build, o EAS injeta env antes de avaliar este arquivo.
 */

// Diagnóstico: ao rodar "eas build", nos logs do EAS procure por "[app.config.js] SUPABASE_ENV_IN_BUILD".
// Se aparecer url=no ou key=no, as variáveis não estão sendo injetadas (nome exato e ambiente no expo.dev).
const _url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const _key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
/** URL pública do app (ex.: https://guestjovem.com) — links dos e-mails Auth / SMTP. */
const _webUrl = (process.env.EXPO_PUBLIC_WEB_URL || '').trim();
console.log('[app.config.js] SUPABASE_ENV_IN_BUILD: url=' + (_url ? 'yes' : 'no') + ' key=' + (_key ? 'yes' : 'no'));

const config = {
  expo: {
    name: 'Guest Jovem',
    slug: 'FireYouth',
    scheme: 'guestjovem',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/app-icon.png',
    platforms: ['ios', 'android', 'web'],
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/app-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#D32F2F',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.thiagosc31.GuestJovem',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/app-icon.png',
        backgroundColor: '#D32F2F',
      },
      edgeToEdgeEnabled: true,
      package: 'com.thiagosc31.GuestJovem',
    },
    plugins: ['./plugins/withAndroidBackCallback.js'],
    web: {
      favicon: './assets/app-icon.png',
    },
    extra: {
      eas: {
        projectId: '7666100b-87db-45b3-87d8-fe659cec2b62',
      },
      // Embutir variáveis do EAS Build em extra (lidas no momento em que este arquivo é avaliado)
      EXPO_PUBLIC_SUPABASE_URL: _url,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: _key,
      EXPO_PUBLIC_WEB_URL: _webUrl,
    },
  },
};

export default config;

const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Plugin que adiciona android:enableOnBackInvokedCallback="true" ao <application>
 * para habilitar o gesto de voltar (Android 13+) e remover o aviso no log.
 */
function withAndroidBackCallback(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest?.application?.[0];
    if (app && app.$) {
      app.$['android:enableOnBackInvokedCallback'] = 'true';
    }
    return config;
  });
}

module.exports = withAndroidBackCallback;

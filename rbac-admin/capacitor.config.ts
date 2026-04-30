import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bawei.aicheck',
  appName: '八维智能阅卷',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;

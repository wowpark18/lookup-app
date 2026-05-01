import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wowpark18.lookup',
  appName: 'Look-UP',
  webDir: 'dist',
  server: {
    // [코다리 부장] 실기기 실시간 미러링을 위해 로컬 IP로 설정 필요
    // npx cap run ios -l --external 명령어를 사용하면 자동으로 잡힙니다.
    cleartext: true,
  },
  ios: {
    // allowInlineMediaPlayback: true,
  },
};

export default config;


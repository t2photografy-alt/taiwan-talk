import type {
  DeviceCapabilitySnapshot,
  DeviceCapabilityState,
  DeviceDisplayMode,
  DeviceNetworkStatus,
  MicrophonePermissionStatus,
} from './types';

const STORAGE_TEST_KEY = 'taiwan-talk:device-capability-test';

function toCapabilityState(condition: boolean): DeviceCapabilityState {
  return condition ? 'supported' : 'unsupported';
}

function isLocalHost() {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function canUseSecureBrowserApis() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.isSecureContext || isLocalHost();
}

function checkLocalStorage(): DeviceCapabilityState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'unsupported';
  }

  try {
    window.localStorage.setItem(STORAGE_TEST_KEY, 'ok');
    window.localStorage.removeItem(STORAGE_TEST_KEY);
    return 'supported';
  } catch {
    return 'unsupported';
  }
}

function checkSpeechVoices(): DeviceCapabilityState {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return 'unsupported';
  }

  try {
    return window.speechSynthesis.getVoices().length > 0 ? 'supported' : 'unknown';
  } catch {
    return 'unknown';
  }
}

function getDisplayMode(): DeviceDisplayMode {
  if (typeof window === 'undefined') {
    return 'browser';
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;

  return isStandalone ? 'standalone' : 'browser';
}

function getNetworkStatus(): DeviceNetworkStatus {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return 'unknown';
  }

  return navigator.onLine ? 'online' : 'offline';
}

async function getMicrophonePermissionStatus(recording: DeviceCapabilityState): Promise<MicrophonePermissionStatus> {
  if (recording !== 'supported' || typeof navigator === 'undefined') {
    return 'unavailable';
  }

  if (!navigator.permissions?.query) {
    return 'permission-required';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

    if (permission.state === 'granted') {
      return 'granted';
    }

    if (permission.state === 'denied') {
      return 'unavailable';
    }

    return 'permission-required';
  } catch {
    return 'permission-required';
  }
}

function buildBaseSnapshot(microphonePermission: MicrophonePermissionStatus): DeviceCapabilitySnapshot {
  const speechSynthesis = toCapabilityState(
    typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window,
  );
  const getUserMedia = toCapabilityState(
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function',
  );
  const mediaRecorder = toCapabilityState(typeof window !== 'undefined' && 'MediaRecorder' in window);
  const recording = toCapabilityState(
    canUseSecureBrowserApis() &&
      getUserMedia === 'supported' &&
      mediaRecorder === 'supported',
  );

  return {
    checkedAt: new Date().toISOString(),
    isSecureContext: canUseSecureBrowserApis(),
    speechSynthesis,
    speechVoices: checkSpeechVoices(),
    recording,
    getUserMedia,
    mediaRecorder,
    microphonePermission,
    localStorage: checkLocalStorage(),
    displayMode: getDisplayMode(),
    networkStatus: getNetworkStatus(),
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  };
}

class BrowserDeviceCapabilities {
  getInitialSnapshot(): DeviceCapabilitySnapshot {
    const snapshot = buildBaseSnapshot('unknown');

    return {
      ...snapshot,
      microphonePermission:
        snapshot.recording === 'supported' ? 'permission-required' : 'unavailable',
    };
  }

  async getSnapshot(): Promise<DeviceCapabilitySnapshot> {
    const snapshot = buildBaseSnapshot('unknown');
    const microphonePermission = await getMicrophonePermissionStatus(snapshot.recording);

    return {
      ...snapshot,
      microphonePermission,
    };
  }
}

export const deviceCapabilities = new BrowserDeviceCapabilities();

export type DeviceCapabilityState = 'supported' | 'unsupported' | 'unknown';

export type MicrophonePermissionStatus =
  | 'permission-required'
  | 'granted'
  | 'unavailable'
  | 'unknown';

export type DeviceDisplayMode = 'browser' | 'standalone';

export type DeviceNetworkStatus = 'online' | 'offline' | 'unknown';

export type DeviceCapabilitySnapshot = {
  checkedAt: string;
  isSecureContext: boolean;
  speechSynthesis: DeviceCapabilityState;
  speechVoices: DeviceCapabilityState;
  recording: DeviceCapabilityState;
  getUserMedia: DeviceCapabilityState;
  mediaRecorder: DeviceCapabilityState;
  microphonePermission: MicrophonePermissionStatus;
  localStorage: DeviceCapabilityState;
  displayMode: DeviceDisplayMode;
  networkStatus: DeviceNetworkStatus;
  userAgent: string;
};

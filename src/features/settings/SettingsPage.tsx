import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic2, RefreshCw, ShieldCheck, SlidersHorizontal, Smartphone, Sparkles, Square, Volume2 } from 'lucide-react';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { deviceCapabilities } from '../../lib/device/deviceCapabilities';
import type { DeviceCapabilitySnapshot } from '../../lib/device/types';
import { useDisplayLanguage } from '../../lib/displayLanguage/DisplayLanguageProvider';
import type { TranslationKey } from '../../lib/displayLanguage/types';
import { recorderService } from '../../lib/recorder/recorderService';
import type { RecordedAudio, RecorderSession } from '../../lib/recorder/types';
import { speechService } from '../../lib/speech/speechService';
import type { VoicePreference } from '../../lib/speech/types';
import { readVoicePreference, writeVoicePreference } from '../../lib/speech/voicePreference';

type SettingsPageProps = {
  onNavigate: (path: string) => void;
};

const SPEECH_TEST_TEXT = '你好，這是 Taiwan Talk 的聲音測試。';
const voicePreferenceOptions: Array<{ value: VoicePreference; labelKey: TranslationKey }> = [
  { value: 'auto', labelKey: 'settings.voiceAuto' },
  { value: 'female', labelKey: 'settings.voiceFemale' },
  { value: 'male', labelKey: 'settings.voiceMale' },
];
type TFunction = (key: TranslationKey) => string;

function capabilityLabel(isSupported: boolean, t: TFunction) {
  return isSupported ? t('settings.supported') : t('settings.unsupported');
}

function supportTone(isSupported: boolean) {
  return isSupported ? 'text-emerald-700' : 'text-[#b42318]';
}

function microphoneLabel(capabilities: DeviceCapabilitySnapshot) {
  if (capabilities.microphonePermission === 'granted') {
    return 'settings.checked';
  }

  if (capabilities.microphonePermission === 'unavailable') {
    return 'settings.maybeUnavailable';
  }

  return 'settings.permissionNeeded';
}

function statusLabel(capabilities: DeviceCapabilitySnapshot, t: TFunction) {
  return [
    {
      label: t('settings.speech'),
      value: capabilityLabel(capabilities.speechSynthesis === 'supported', t),
      tone: supportTone(capabilities.speechSynthesis === 'supported'),
    },
    {
      label: t('settings.recording'),
      value: capabilityLabel(capabilities.recording === 'supported', t),
      tone: supportTone(capabilities.recording === 'supported'),
    },
    {
      label: t('settings.microphone'),
      value: t(microphoneLabel(capabilities) as TranslationKey),
      tone: capabilities.microphonePermission === 'unavailable' ? 'text-[#b42318]' : 'text-[#344054]',
    },
    {
      label: t('settings.storage'),
      value: capabilities.localStorage === 'supported' ? t('settings.localStorageSupported') : t('settings.unsupported'),
      tone: supportTone(capabilities.localStorage === 'supported'),
    },
    {
      label: t('settings.displayMode'),
      value: capabilities.displayMode === 'standalone' ? t('settings.homeMode') : t('settings.browserMode'),
      tone: 'text-[#344054]',
    },
    {
      label: t('settings.network'),
      value: capabilities.networkStatus === 'offline' ? t('settings.offline') : t('settings.online'),
      tone: capabilities.networkStatus === 'offline' ? 'text-[#b42318]' : 'text-emerald-700',
    },
  ];
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [capabilities, setCapabilities] = useState<DeviceCapabilitySnapshot>(() =>
    deviceCapabilities.getInitialSnapshot(),
  );
  const [audioStatusKey, setAudioStatusKey] = useState<TranslationKey>('settings.notRun');
  const [recordingStatusKey, setRecordingStatusKey] = useState<TranslationKey>('settings.notRun');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [voicePreference, setVoicePreference] = useState<VoicePreference>(() => readVoicePreference());
  const recorderSessionRef = useRef<RecorderSession | null>(null);
  const { t } = useDisplayLanguage();

  const refreshCapabilities = useCallback(async () => {
    const nextCapabilities = await deviceCapabilities.getSnapshot();
    setCapabilities(nextCapabilities);
  }, []);

  useEffect(() => {
    void refreshCapabilities();

    const handleDeviceChange = () => {
      void refreshCapabilities();
    };

    window.addEventListener('online', handleDeviceChange);
    window.addEventListener('offline', handleDeviceChange);
    window.speechSynthesis?.addEventListener?.('voiceschanged', handleDeviceChange);

    return () => {
      window.removeEventListener('online', handleDeviceChange);
      window.removeEventListener('offline', handleDeviceChange);
      window.speechSynthesis?.removeEventListener?.('voiceschanged', handleDeviceChange);
    };
  }, [refreshCapabilities]);

  useEffect(
    () => () => {
      recorderSessionRef.current?.cancel();
      speechService.stop();
    },
    [],
  );

  useEffect(() => () => recorderService.releaseRecording(recordedAudio), [recordedAudio]);

  const handleSpeechTest = () => {
    const result = speechService.speak(SPEECH_TEST_TEXT, {
      voicePreference,
      callbacks: {
        onError: () => {
          setAudioStatusKey('settings.speechUnavailable');
        },
      },
    });

    if (result.ok) {
      setAudioStatusKey('settings.speechPlayed');
    } else {
      setAudioStatusKey('settings.speechUnavailable');
    }

    void refreshCapabilities();
  };

  const stopRecordingTest = async () => {
    const session = recorderSessionRef.current;

    if (!session) {
      setRecordingStatusKey('settings.recordingNotStarted');
      setIsRecording(false);
      return;
    }

    try {
      const recording = await session.stop();
      setRecordedAudio(recording);
      setRecordingStatusKey('settings.recordingDone');
    } catch {
      setRecordingStatusKey('settings.recordingStopFailed');
    } finally {
      recorderSessionRef.current = null;
      setIsRecording(false);
      void refreshCapabilities();
    }
  };

  const handleRecordingTest = async () => {
    if (isRecording) {
      await stopRecordingTest();
      return;
    }

    recorderService.releaseRecording(recordedAudio);
    setRecordedAudio(null);
    setRecordingStatusKey('settings.checkingMic');

    const result = await recorderService.startRecording();

    if (!result.ok) {
      setRecordingStatusKey('settings.maybeUnavailable');
      setIsRecording(false);
      void refreshCapabilities();
      return;
    }

    recorderSessionRef.current = result.session;
    setIsRecording(true);
    setRecordingStatusKey('practice.recording');
    void refreshCapabilities();
  };

  const playRecordedAudio = () => {
    if (!recordedAudio) {
      setRecordingStatusKey('settings.noRecording');
      return;
    }

    const audio = new Audio(recordedAudio.url);
    void audio.play().catch(() => {
      setRecordingStatusKey('settings.recordingPlaybackFailed');
    });
  };

  const handleVoicePreferenceChange = (preference: VoicePreference) => {
    setVoicePreference(preference);
    writeVoicePreference(preference);
  };

  return (
    <div>
      <Header
        title={t('page.settings.title')}
        subtitle={t('page.settings.subtitle')}
        onMenu={() => onNavigate('/')}
      />

      <section className="space-y-3">
        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="text-[var(--brand-blue)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">{t('settings.aboutTitle')}</h2>
          </div>
          <p className="text-sm font-bold leading-relaxed text-[#344054]">
            {t('settings.aboutBody')}
          </p>
        </article>

        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles aria-hidden="true" className="text-[var(--brand-red)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">{t('settings.storageTitle')}</h2>
          </div>
          <p className="text-sm font-bold leading-relaxed text-[#344054]">
            {t('settings.storageBody')}
          </p>
        </article>

        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="text-[var(--brand-red)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">{t('settings.voiceSettings')}</h2>
          </div>
          <p className="mb-3 text-sm font-bold leading-relaxed text-[#344054]">
            {t('settings.voiceDescription')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {voicePreferenceOptions.map((item) => {
              const selected = voicePreference === item.value;

              return (
                <button
                  key={item.value}
                  aria-pressed={selected}
                  className={[
                    'min-h-11 rounded-[14px] border px-2 text-sm font-black whitespace-nowrap transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
                    selected
                      ? 'border-[var(--brand-blue)] bg-[#eef6ff] text-[var(--brand-blue)]'
                      : 'border-[#d9e1ee] bg-white text-[#344054] active:bg-[#f3f6fb]',
                  ].join(' ')}
                  type="button"
                  onClick={() => handleVoicePreferenceChange(item.value)}
                >
                  {t(item.labelKey)}
                </button>
              );
            })}
          </div>
        </article>

        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Smartphone aria-hidden="true" className="text-[var(--brand-blue)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">{t('settings.deviceCheck')}</h2>
          </div>
          <p className="mb-3 text-sm font-bold leading-relaxed text-[#344054]">
            {t('settings.deviceCheckDescription')}
          </p>

          <dl className="grid grid-cols-1 gap-2 text-sm">
            {statusLabel(capabilities, t).map((item) => (
              <div
                className="flex min-h-10 items-center justify-between gap-3 rounded-[14px] border border-[#e5ebf3] bg-white px-3 py-2"
                key={item.label}
              >
                <dt className="shrink-0 font-bold text-[#667085]">{item.label}</dt>
                <dd className={`text-right font-black ${item.tone}`}>{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <PrimaryButton
              icon={<Volume2 aria-hidden="true" size={18} />}
              variant="soft"
              onClick={handleSpeechTest}
            >
              {t('settings.speechTest')}
            </PrimaryButton>
            <PrimaryButton
              icon={isRecording ? <Square aria-hidden="true" size={17} /> : <Mic2 aria-hidden="true" size={18} />}
              variant={isRecording ? 'danger' : 'soft'}
              onClick={handleRecordingTest}
            >
              {isRecording ? t('cta.stop') : t('settings.recordingTest')}
            </PrimaryButton>
            {recordedAudio ? (
              <PrimaryButton icon={<Volume2 aria-hidden="true" size={18} />} variant="ghost" onClick={playRecordedAudio}>
                {t('settings.recordingPlayback')}
              </PrimaryButton>
            ) : null}
            <PrimaryButton
              icon={<RefreshCw aria-hidden="true" size={18} />}
              variant="ghost"
              onClick={() => void refreshCapabilities()}
            >
              {t('settings.recheck')}
            </PrimaryButton>
          </div>

          <div className="mt-3 rounded-[14px] bg-[#f9fbff] px-3 py-2 text-xs font-bold leading-relaxed text-[#667085]">
            <p>{t('settings.speech')}：{t(audioStatusKey)}</p>
            <p>{t('settings.recording')}：{t(recordingStatusKey)}</p>
          </div>
        </article>

        <article className="rounded-[18px] border border-[#d9e1ee] bg-[#f9fbff] p-4">
          <p className="text-sm font-bold leading-relaxed text-[#667085]">
            {t('settings.mockNote')}
          </p>
        </article>
      </section>

      <PrimaryButton className="mt-5" fullWidth variant="blue" onClick={() => onNavigate('/')}>
        {t('settings.backHome')}
      </PrimaryButton>
    </div>
  );
}

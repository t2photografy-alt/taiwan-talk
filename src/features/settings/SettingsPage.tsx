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

const SPEECH_TEST_TEXT = '你好，這是 Taiwan Talk 的音聲測試。';
const voicePreferenceOptions: Array<{ value: VoicePreference; labelKey: TranslationKey }> = [
  { value: 'auto', labelKey: 'settings.voiceAuto' },
  { value: 'female', labelKey: 'settings.voiceFemale' },
  { value: 'male', labelKey: 'settings.voiceMale' },
];
type TFunction = (key: TranslationKey) => string;

function capabilityLabel(isSupported: boolean) {
  return isSupported ? '対応' : '未対応';
}

function supportTone(isSupported: boolean) {
  return isSupported ? 'text-emerald-700' : 'text-[#b42318]';
}

function microphoneLabel(capabilities: DeviceCapabilitySnapshot) {
  if (capabilities.microphonePermission === 'granted') {
    return '確認済み';
  }

  if (capabilities.microphonePermission === 'unavailable') {
    return '使えない可能性';
  }

  return '許可が必要';
}

function statusLabel(capabilities: DeviceCapabilitySnapshot, t: TFunction) {
  return [
    {
      label: t('settings.speech'),
      value: capabilityLabel(capabilities.speechSynthesis === 'supported'),
      tone: supportTone(capabilities.speechSynthesis === 'supported'),
    },
    {
      label: t('settings.recording'),
      value: capabilityLabel(capabilities.recording === 'supported'),
      tone: supportTone(capabilities.recording === 'supported'),
    },
    {
      label: t('settings.microphone'),
      value: microphoneLabel(capabilities),
      tone: capabilities.microphonePermission === 'unavailable' ? 'text-[#b42318]' : 'text-[#344054]',
    },
    {
      label: t('settings.storage'),
      value: capabilities.localStorage === 'supported' ? '端末内保存に対応' : '未対応',
      tone: supportTone(capabilities.localStorage === 'supported'),
    },
    {
      label: t('settings.displayMode'),
      value: capabilities.displayMode === 'standalone' ? 'ホーム追加表示' : 'ブラウザ',
      tone: 'text-[#344054]',
    },
    {
      label: t('settings.network'),
      value: capabilities.networkStatus === 'offline' ? 'オフライン' : 'オンライン',
      tone: capabilities.networkStatus === 'offline' ? 'text-[#b42318]' : 'text-emerald-700',
    },
  ];
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [capabilities, setCapabilities] = useState<DeviceCapabilitySnapshot>(() =>
    deviceCapabilities.getInitialSnapshot(),
  );
  const [audioStatus, setAudioStatus] = useState('未実行');
  const [recordingStatus, setRecordingStatus] = useState('未実行');
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
          setAudioStatus('この端末では音声再生が使えない可能性があります');
        },
      },
    });

    if (result.ok) {
      setAudioStatus('音声テストを再生しました');
    } else {
      setAudioStatus('この端末では音声再生が使えない可能性があります');
    }

    void refreshCapabilities();
  };

  const stopRecordingTest = async () => {
    const session = recorderSessionRef.current;

    if (!session) {
      setRecordingStatus('録音を開始できていません');
      setIsRecording(false);
      return;
    }

    try {
      const recording = await session.stop();
      setRecordedAudio(recording);
      setRecordingStatus('録音できました');
    } catch {
      setRecordingStatus('録音を停止できませんでした。もう一度お試しください。');
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
    setRecordingStatus('マイク許可を確認しています');

    const result = await recorderService.startRecording();

    if (!result.ok) {
      setRecordingStatus(result.error.message);
      setIsRecording(false);
      void refreshCapabilities();
      return;
    }

    recorderSessionRef.current = result.session;
    setIsRecording(true);
    setRecordingStatus('録音中');
    void refreshCapabilities();
  };

  const playRecordedAudio = () => {
    if (!recordedAudio) {
      setRecordingStatus('聞き返す録音がありません');
      return;
    }

    const audio = new Audio(recordedAudio.url);
    void audio.play().catch(() => {
      setRecordingStatus('録音音声を再生できませんでした');
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
            <h2 className="text-base font-black text-[#141821]">このアプリについて</h2>
          </div>
          <p className="text-sm font-bold leading-relaxed text-[#344054]">
            Taiwan Talk は、台湾華語と日本語の自然な会話を助ける、非公式の会話サポートアプリです。
            完璧な翻訳保証ではなく、気持ちを伝えるきっかけを作るための補助です。
          </p>
        </article>

        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles aria-hidden="true" className="text-[var(--brand-red)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">保存データと今後</h2>
          </div>
          <p className="text-sm font-bold leading-relaxed text-[#344054]">
            初回実装では、保存したフレーズはこの端末のブラウザ内に置かれます。
            将来はAI生成、音声認識、Supabase連携へ差し替えられる構造にしています。
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
                録音を聞く
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
            <p>音声：{audioStatus}</p>
            <p>録音：{recordingStatus}</p>
          </div>
        </article>

        <article className="rounded-[18px] border border-[#d9e1ee] bg-[#f9fbff] p-4">
          <p className="text-sm font-bold leading-relaxed text-[#667085]">
            現在は開発中のため、AI生成結果と発音チェック結果は確認前の表示です。
            API key未設定時の生成、音声再生、録音はブラウザ機能や仮実装を使います。
            台湾華語の表現は、今後ネイティブ確認を入れて調整予定です。
          </p>
        </article>
      </section>

      <PrimaryButton className="mt-5" fullWidth variant="blue" onClick={() => onNavigate('/')}>
        使うへ戻る
      </PrimaryButton>
    </div>
  );
}

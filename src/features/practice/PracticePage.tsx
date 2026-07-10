import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  CircleHelp,
  Clock3,
  Maximize2,
  Mic2,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { presetPhrases } from '../../data/presets';
import { getMandarinText } from '../../lib/conversation/phraseDisplay';
import type { Phrase, PracticeResult } from '../../lib/conversation/types';
import { useDisplayLanguage } from '../../lib/displayLanguage/DisplayLanguageProvider';
import { practiceService } from '../../lib/practice/practiceService';
import { recorderService } from '../../lib/recorder/recorderService';
import type { RecordedAudio, RecorderSession } from '../../lib/recorder/types';
import { useSpeechPlayback } from '../../lib/speech/useSpeechPlayback';

type PracticePageProps = {
  savedPhrases: Phrase[];
  selectedPhraseId?: string;
  onNavigate: (path: string) => void;
  onDisplay: (phrase: Phrase) => void;
  onSavePhrase: (phrase: Phrase) => Promise<void>;
  onMarkPracticed: (phraseId: string) => Promise<void>;
};

type RecordingUiState = 'idle' | 'starting' | 'recording' | 'recorded' | 'checking' | 'error';

function Waveform({ active = false }: { active?: boolean }) {
  const heights = [14, 22, 34, 52, 30, 18, 42, 26, 16, 36, 20];

  return (
    <div className="flex h-16 items-center justify-center gap-1.5" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={['wave-bar', active ? 'animate-pulse' : ''].join(' ')}
          style={{ height }}
        />
      ))}
    </div>
  );
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'マイクを使えませんでした。ブラウザの許可設定を確認してください。';
}

export function PracticePage({
  savedPhrases,
  selectedPhraseId,
  onNavigate,
  onDisplay,
  onSavePhrase,
  onMarkPracticed,
}: PracticePageProps) {
  const allPhrases = useMemo(() => [...savedPhrases, ...presetPhrases], [savedPhrases]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const selectedPhrase =
    allPhrases.find((phrase) => phrase.id === selectedPhraseId) ??
    allPhrases[phraseIndex % allPhrases.length] ??
    presetPhrases[0];
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingUiState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [recorderNotice, setRecorderNotice] = useState('');
  const [notice, setNotice] = useState('');
  const recorderSessionRef = useRef<RecorderSession | null>(null);
  const recordedAudioRef = useRef<RecordedAudio | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t } = useDisplayLanguage();
  const speechPlayback = useSpeechPlayback();
  const speechLockedForRecording = recordingState === 'starting' || recordingState === 'recording';
  const practiceText = getMandarinText(selectedPhrase);
  const supportText =
    practiceText === selectedPhrase.resultText ? selectedPhrase.sourceText : selectedPhrase.resultText;
  const stepLabels = [
    t('practice.stepListen'),
    t('practice.stepRecord'),
    t('practice.stepCheck'),
    t('practice.stepSaveWeak'),
  ];

  useEffect(() => {
    recordedAudioRef.current = recordedAudio;
  }, [recordedAudio]);

  useEffect(() => {
    if (recordingState !== 'recording') {
      return;
    }

    const updateSeconds = () => {
      const startedAt = recorderSessionRef.current?.startedAt ?? Date.now();
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };

    updateSeconds();
    const timer = window.setInterval(updateSeconds, 250);
    return () => window.clearInterval(timer);
  }, [recordingState]);

  useEffect(
    () => () => {
      recorderSessionRef.current?.cancel();
      recorderService.releaseRecording(recordedAudioRef.current);
    },
    [],
  );

  function clearRecordedAudio() {
    if (recordedAudioRef.current) {
      recorderService.releaseRecording(recordedAudioRef.current);
    }

    recordedAudioRef.current = null;
    setRecordedAudio(null);
  }

  function resetRecording() {
    recorderSessionRef.current?.cancel();
    recorderSessionRef.current = null;
    clearRecordedAudio();
    setRecordingSeconds(0);
    setRecordingState('idle');
    setRecorderNotice('');
    setResult(null);
  }

  async function startRecording() {
    if (speechLockedForRecording || recordingState === 'checking') {
      return;
    }

    setRecordingState('starting');
    setNotice('');
    setResult(null);
    setRecorderNotice('');
    await speechPlayback.stop();
    clearRecordedAudio();

    const started = await recorderService.startRecording();

    if (!started.ok) {
      setRecordingState('error');
      setRecorderNotice(started.error.message);
      return;
    }

    recorderSessionRef.current = started.session;
    setRecordingSeconds(0);
    setRecordingState('recording');
  }

  async function stopRecording() {
    const session = recorderSessionRef.current;

    if (!session) {
      return;
    }

    try {
      const recording = await session.stop();
      recorderSessionRef.current = null;
      recordedAudioRef.current = recording;
      setRecordedAudio(recording);
      setRecordingState('recorded');
      setRecorderNotice(t('practice.recordedNotice'));
    } catch (error) {
      recorderSessionRef.current = null;
      setRecordingState('error');
      setRecorderNotice(errorMessage(error));
    }
  }

  async function playRecordedAudio() {
    if (!audioRef.current) {
      return;
    }

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      setRecorderNotice(t('settings.recordingPlaybackFailed'));
    }
  }

  async function runMockCheck() {
    if (!recordedAudio) {
      setRecorderNotice(t('practice.needRecording'));
      return;
    }

    setRecordingState('checking');
    setNotice('');
    const nextResult = await practiceService.checkPronunciation(selectedPhrase);
    await onMarkPracticed(selectedPhrase.id);

    window.setTimeout(() => {
      setResult(nextResult);
      setRecordingState('recorded');
      setRecorderNotice('');
    }, 420);
  }

  async function saveWeakPhrase() {
    await onSavePhrase({
      ...selectedPhrase,
      isFavorite: true,
      note: selectedPhrase.note ?? t('practice.saveWeak'),
    });
    setNotice(t('practice.savedWeak'));
  }

  function goNextPhrase() {
    resetRecording();
    setPhraseIndex((current) => current + 1);
    setNotice('');
  }

  return (
    <div>
      <Header
        title={t('page.practice.title')}
        subtitle={t('page.practice.subtitle')}
        rightIcon={<CircleHelp aria-hidden="true" size={23} strokeWidth={2.3} />}
        onMenu={() => onNavigate('/settings')}
      />

      <section className="glass-card mb-4 rounded-[20px] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#667085]">{t('practice.todayPhrase')}</p>
            <h2
              className="mt-1 text-[17px] font-black leading-relaxed text-[#141821]"
              data-testid="practice-phrase-text"
            >
              {practiceText.replace('\n', ' ')}
            </h2>
          </div>
          <button
            aria-label="大きく表示"
            className="grid h-10 w-10 place-items-center rounded-full text-[#344054] active:bg-[#f3f6fb]"
            type="button"
            onClick={() => onDisplay(selectedPhrase)}
          >
            <Maximize2 aria-hidden="true" size={20} strokeWidth={2.3} />
          </button>
        </div>
        <p className="text-sm font-bold text-[#344054]">{selectedPhrase.pinyin}</p>
        <p className="mt-1 text-sm font-bold text-[#667085]">{supportText}</p>
      </section>

      <section className="mb-4">
        <div className="mb-3 flex items-center gap-2 overflow-hidden">
          {stepLabels.map((label, index) => (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-1">
              <span
                className={[
                  'grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-black',
                  index === 1 ? 'bg-[var(--brand-red)] text-white' : 'bg-[#e8edf5] text-[#344054]',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span
                className={[
                  'truncate text-[10px] font-black',
                  index === 1 ? 'text-[var(--brand-red)]' : 'text-[#667085]',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton
            data-speech-language="zh-TW"
            data-speech-text={practiceText}
            data-testid="practice-main-listen"
            disabled={speechLockedForRecording}
            icon={<Volume2 aria-hidden="true" size={18} />}
            variant="blue"
            onClick={() => {
              if (speechLockedForRecording) return;
              void speechPlayback.toggle({
                phraseId: selectedPhrase.id,
                text: practiceText,
                language: 'zh-TW',
                speed: 'normal',
              });
            }}
          >
            {speechPlayback.isLoading(selectedPhrase.id, 'normal')
              ? t('cta.loading')
              : speechPlayback.isStopping(selectedPhrase.id, 'normal')
                ? t('cta.stopping')
                : speechPlayback.isPlaying(selectedPhrase.id, 'normal')
                  ? t('cta.stop')
                  : t('cta.listen')}
          </PrimaryButton>
          <PrimaryButton
            data-speech-language="zh-TW"
            data-speech-text={practiceText}
            data-testid="practice-main-slow"
            disabled={speechLockedForRecording}
            icon={<Clock3 aria-hidden="true" size={18} />}
            variant="soft"
            onClick={() => {
              if (speechLockedForRecording) return;
              void speechPlayback.toggle({
                phraseId: selectedPhrase.id,
                text: practiceText,
                language: 'zh-TW',
                speed: 'slow',
              });
            }}
          >
            {speechPlayback.isLoading(selectedPhrase.id, 'slow')
              ? t('cta.loading')
              : speechPlayback.isStopping(selectedPhrase.id, 'slow')
                ? t('cta.stopping')
                : speechPlayback.isPlaying(selectedPhrase.id, 'slow')
                  ? t('cta.stop')
                  : t('cta.slowListen')}
          </PrimaryButton>
        </div>
        {speechPlayback.error ? (
          <p className="mt-2 rounded-[12px] bg-[#fff7f7] px-3 py-2 text-xs font-bold leading-relaxed text-[#b42318]">
            {speechPlayback.error}
          </p>
        ) : null}
        {speechPlayback.provider === 'browser-fallback' ? (
          <p className="mt-2 rounded-[12px] bg-[#fffaf0] px-3 py-2 text-xs font-bold leading-relaxed text-[#b45309]" data-testid="speech-fallback-notice">
            {t('speech.fallbackNotice')}
          </p>
        ) : null}
      </section>

      <section className="glass-card mb-4 rounded-[22px] p-4 text-center">
        <p className="text-sm font-black text-[#141821]">{t('practice.pressToTalk')}</p>
        <p className="mt-1 text-xs font-bold text-[#667085]">
          {recordingState === 'recording'
            ? t('practice.recording')
            : recordingState === 'starting'
              ? t('practice.preparingRecording')
              : recordingState === 'recorded'
                ? t('practice.recorded')
                : recordingState === 'checking'
                  ? t('practice.checking')
                  : t('practice.recordingIdle')}
        </p>
        <div className="mt-2 grid grid-cols-[1fr_92px_1fr] items-center gap-3">
          <Waveform active={recordingState === 'recording'} />
          <button
            aria-label={recordingState === 'recording' ? t('practice.stopRecording') : t('practice.startRecording')}
            className={[
              'grid h-[92px] w-[92px] place-items-center rounded-full text-white shadow-[0_16px_30px_rgba(239,31,36,0.28)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
              recordingState === 'recording' ? 'bg-[#b91c1c]' : 'bg-[var(--brand-red)]',
            ].join(' ')}
            data-testid={recordingState === 'recording' ? 'practice-recording-stop' : 'practice-recording-start'}
            type="button"
            onClick={() => {
              if (recordingState === 'recording') {
                void stopRecording();
                return;
              }
              void startRecording();
            }}
            disabled={recordingState === 'checking' || recordingState === 'starting'}
          >
            {recordingState === 'recording' ? (
              <Square aria-hidden="true" fill="currentColor" size={36} strokeWidth={2.6} />
            ) : (
              <Mic2 aria-hidden="true" size={44} strokeWidth={2.6} />
            )}
          </button>
          <Waveform active={recordingState === 'recording'} />
        </div>
        <p className="mt-2 text-sm font-bold text-[#344054]">{formatSeconds(recordingSeconds)}</p>

        {recordedAudio ? (
          <div className="mt-3 space-y-2">
            <audio ref={audioRef} src={recordedAudio.url} />
            <div className="grid grid-cols-2 gap-2">
              <PrimaryButton icon={<Play aria-hidden="true" size={18} />} variant="soft" onClick={playRecordedAudio}>
                {t('practice.listenOwn')}
              </PrimaryButton>
              <PrimaryButton icon={<RotateCcw aria-hidden="true" size={18} />} variant="soft" onClick={resetRecording}>
                {t('practice.recordAgain')}
              </PrimaryButton>
              <PrimaryButton
                className="col-span-2"
                fullWidth
                icon={<Mic2 aria-hidden="true" size={18} />}
                onClick={() => void runMockCheck()}
                disabled={recordingState === 'checking'}
              >
                {recordingState === 'checking' ? t('practice.checkingButton') : t('practice.toCheck')}
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {recorderNotice ? (
          <p
            className={[
              'mt-3 rounded-[12px] px-3 py-2 text-xs font-bold leading-relaxed',
              recordingState === 'error' ? 'bg-[#fff7f7] text-[#b42318]' : 'bg-[#f3f6fb] text-[#344054]',
            ].join(' ')}
          >
            {recorderNotice}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="glass-card mb-4 rounded-[20px] p-4">
          <h2 className="mb-3 text-sm font-black text-[#141821]">{t('practice.resultTitle')}</h2>
          <div className="grid grid-cols-[1fr_1.1fr] gap-4">
            <div>
              <p className="text-sm font-black text-[var(--brand-red)]">{t('practice.scoreLabel')}</p>
              <p className="mt-1 text-[54px] font-black leading-none text-[var(--brand-red)]">
                {result.score}%
              </p>
              <p className="mt-2 text-sm font-black text-[#344054]">{t('practice.scoreComment')}</p>
            </div>
            <dl className="space-y-3 border-l border-[#edf1f7] pl-4 text-sm font-bold text-[#344054]">
              <div className="flex justify-between gap-3">
                <dt>{t('practice.closeness')}</dt>
                <dd className="font-black text-[#141821]">{result.pronunciationCloseness}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('practice.flow')}</dt>
                <dd className="font-black text-[#141821]">{result.naturalFlow}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('practice.words')}</dt>
                <dd className="font-black text-[#141821]">
                  {result.recognizedWordCount} / {result.totalWordCount}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 rounded-[12px] bg-[#f3f6fb] px-3 py-2 text-xs font-bold leading-relaxed text-[#667085]">
            {t('practice.mockNotice')}
          </p>
        </section>
      ) : null}

      <section className="soft-blue mb-4 rounded-[18px] p-4">
        <h2 className="text-sm font-black text-[#0f766e]">{t('practice.advice')}</h2>
        <p className="mt-1 text-sm font-bold leading-relaxed text-[#344054]">
          {result?.advice ?? t('practice.defaultAdvice')}
        </p>
      </section>

      <section className="glass-card mb-4 rounded-[18px] p-3">
        <div className="grid grid-cols-[1fr_42px] items-center gap-2">
          <div>
            <p className="text-xs font-black text-[#0f766e]">{t('practice.memory')}</p>
            <p className="mt-1 text-lg font-black text-[#141821]">{practiceText.replace('\n', ' ')}</p>
          </div>
          <button
            aria-label={t('practice.playMemory')}
            className="grid h-11 w-11 place-items-center rounded-full bg-[#eef6ff] text-[var(--brand-blue)]"
            type="button"
            onClick={() =>
              speechPlayback.toggle({
                phraseId: selectedPhrase.id,
                text: practiceText,
                language: 'zh-TW',
                speed: 'normal',
              })
            }
          >
            <Play aria-hidden="true" fill="currentColor" size={22} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <PrimaryButton icon={<RotateCcw aria-hidden="true" size={18} />} variant="soft" onClick={resetRecording}>
          {t('practice.recordAgain')}
        </PrimaryButton>
        <PrimaryButton variant="blue" onClick={goNextPhrase}>
          {t('practice.nextPhrase')}
        </PrimaryButton>
        <PrimaryButton
          className="col-span-2"
          icon={<Bookmark aria-hidden="true" size={18} />}
          variant="soft"
          onClick={saveWeakPhrase}
        >
          {t('practice.saveWeak')}
        </PrimaryButton>
      </div>
      {notice ? <p className="mt-3 text-center text-sm font-black text-[var(--brand-red)]">{notice}</p> : null}
    </div>
  );
}

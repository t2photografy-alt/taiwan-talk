import { useEffect, useMemo, useState } from 'react';
import { Bookmark, CircleHelp, Clock3, Maximize2, Mic2, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { presetPhrases } from '../../data/presets';
import type { Phrase, PracticeResult } from '../../lib/conversation/types';
import { practiceService } from '../../lib/practice/practiceService';

type PracticePageProps = {
  savedPhrases: Phrase[];
  selectedPhraseId?: string;
  onNavigate: (path: string) => void;
  onDisplay: (phrase: Phrase) => void;
  onSavePhrase: (phrase: Phrase) => Promise<void>;
  onMarkPracticed: (phraseId: string) => Promise<void>;
};

const stepLabels = ['例文を聞く', '自分の発音を録音', '下次再一起玩吧', '謝謝你〜！'];

function Waveform() {
  const heights = [14, 22, 34, 52, 30, 18, 42, 26, 16, 36, 20];

  return (
    <div className="flex h-16 items-center justify-center gap-1.5" aria-hidden="true">
      {heights.map((height, index) => (
        <span key={`${height}-${index}`} className="wave-bar" style={{ height }} />
      ))}
    </div>
  );
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
  const [isRecording, setIsRecording] = useState(false);
  const [notice, setNotice] = useState('');

  async function runCheck() {
    setIsRecording(true);
    setNotice('');
    const nextResult = await practiceService.checkPronunciation(selectedPhrase);
    await onMarkPracticed(selectedPhrase.id);
    window.setTimeout(() => {
      setResult(nextResult);
      setIsRecording(false);
    }, 420);
  }

  useEffect(() => {
    void practiceService.checkPronunciation(selectedPhrase).then(setResult);
  }, [selectedPhrase.id]);

  async function saveWeakPhrase() {
    await onSavePhrase({
      ...selectedPhrase,
      isFavorite: true,
      note: selectedPhrase.note ?? '苦手に保存したフレーズです。',
    });
    setNotice('苦手に保存しました');
  }

  return (
    <div>
      <Header
        title="練習"
        subtitle="まねして話して、通じやすさをチェック"
        rightIcon={<CircleHelp aria-hidden="true" size={23} strokeWidth={2.3} />}
        onMenu={() => onNavigate('/settings')}
      />

      <section className="glass-card mb-4 rounded-[20px] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#667085]">今日のフレーズ</p>
            <h2 className="mt-1 text-[17px] font-black leading-relaxed text-[#141821]">
              {selectedPhrase.resultText.replace('\n', ' ')}
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
        <p className="mt-1 text-sm font-bold text-[#667085]">{selectedPhrase.sourceText}</p>
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
          <PrimaryButton icon={<Volume2 aria-hidden="true" size={18} />} variant="blue">
            聞く
          </PrimaryButton>
          <PrimaryButton icon={<Clock3 aria-hidden="true" size={18} />} variant="soft">
            ゆっくり聞く
          </PrimaryButton>
        </div>
      </section>

      <section className="glass-card mb-4 rounded-[22px] p-4 text-center">
        <p className="text-sm font-black text-[#141821]">押して話す</p>
        <div className="mt-2 grid grid-cols-[1fr_92px_1fr] items-center gap-3">
          <Waveform />
          <button
            aria-label="録音して発音チェック"
            className={[
              'grid h-[92px] w-[92px] place-items-center rounded-full text-white shadow-[0_16px_30px_rgba(239,31,36,0.28)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
              isRecording ? 'bg-[#b91c1c]' : 'bg-[var(--brand-red)]',
            ].join(' ')}
            type="button"
            onClick={() => void runCheck()}
          >
            <Mic2 aria-hidden="true" size={44} strokeWidth={2.6} />
          </button>
          <Waveform />
        </div>
        <p className="mt-2 text-sm font-bold text-[#344054]">{isRecording ? '0:03 / 0:06' : '0:03 / 0:06'}</p>
      </section>

      {result ? (
        <section className="glass-card mb-4 rounded-[20px] p-4">
          <h2 className="mb-3 text-sm font-black text-[#141821]">あなたの発音チェック結果</h2>
          <div className="grid grid-cols-[1fr_1.1fr] gap-4">
            <div>
              <p className="text-sm font-black text-[var(--brand-red)]">通じやすさ</p>
              <p className="mt-1 text-[54px] font-black leading-none text-[var(--brand-red)]">
                {result.score}%
              </p>
              <p className="mt-2 text-sm font-black text-[#344054]">だいたい通じる！</p>
            </div>
            <dl className="space-y-3 border-l border-[#edf1f7] pl-4 text-sm font-bold text-[#344054]">
              <div className="flex justify-between gap-3">
                <dt>発音の近さ</dt>
                <dd className="font-black text-[#141821]">{result.pronunciationCloseness}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>流れの自然さ</dt>
                <dd className="font-black text-[#141821]">{result.naturalFlow}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>言えた単語</dt>
                <dd className="font-black text-[#141821]">
                  {result.recognizedWordCount} / {result.totalWordCount}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <section className="soft-blue mb-4 rounded-[18px] p-4">
        <h2 className="text-sm font-black text-[#0f766e]">アドバイス</h2>
        <p className="mt-1 text-sm font-bold leading-relaxed text-[#344054]">
          {result?.advice ?? '聞いたあとに録音すると、通じやすさの目安が出ます。'}
        </p>
      </section>

      <section className="glass-card mb-4 rounded-[18px] p-3">
        <div className="grid grid-cols-[1fr_42px] items-center gap-2">
          <div>
            <p className="text-xs font-black text-[#0f766e]">暗記練り練習</p>
            <p className="mt-1 text-lg font-black text-[#141821]">{selectedPhrase.resultText.replace('\n', ' ')}</p>
          </div>
          <button
            aria-label="再生"
            className="grid h-11 w-11 place-items-center rounded-full bg-[#eef6ff] text-[var(--brand-blue)]"
            type="button"
          >
            <Play aria-hidden="true" fill="currentColor" size={22} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <PrimaryButton
          icon={<RotateCcw aria-hidden="true" size={18} />}
          variant="soft"
          onClick={() => void runCheck()}
        >
          もう一回
        </PrimaryButton>
        <PrimaryButton
          variant="blue"
          onClick={() => {
            setPhraseIndex((current) => current + 1);
            setNotice('');
          }}
        >
          次のフレーズ
        </PrimaryButton>
        <PrimaryButton
          className="col-span-2"
          icon={<Bookmark aria-hidden="true" size={18} />}
          variant="soft"
          onClick={saveWeakPhrase}
        >
          苦手に保存
        </PrimaryButton>
      </div>
      {notice ? <p className="mt-3 text-center text-sm font-black text-[var(--brand-red)]">{notice}</p> : null}
    </div>
  );
}

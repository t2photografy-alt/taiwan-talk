import { useMemo, useRef, useState } from 'react';
import { Bookmark, Lightbulb, Mic2, Play, Sparkles, Volume2 } from 'lucide-react';
import { Chip } from '../../components/Chip';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { conversationService } from '../../lib/conversation/conversationService';
import { getMainSpeechTarget, getOriginalSpeechTarget } from '../../lib/conversation/phraseDisplay';
import type {
  ConversationResult,
  LanguageDirection,
  PhraseCategory,
} from '../../lib/conversation/types';
import { useDisplayLanguage } from '../../lib/displayLanguage/DisplayLanguageProvider';
import type { TranslationKey } from '../../lib/displayLanguage/types';
import { useSpeechPlayback } from '../../lib/speech/useSpeechPlayback';

type ComposePageProps = {
  onNavigate: (path: string) => void;
  onSaveResult: (result: ConversationResult) => Promise<void>;
  onDisplayResult: (result: ConversationResult) => void;
};

const categoryOrder: PhraseCategory[] = [
  'greeting',
  'seeAgain',
  'thanks',
  'oshi',
  'photo',
  'event',
  'other',
];

const categoryKey: Record<PhraseCategory, TranslationKey> = {
  greeting: 'category.greeting',
  thanks: 'category.thanks',
  photo: 'category.photo',
  event: 'category.event',
  oshi: 'category.oshi',
  dm: 'category.dm',
  seeAgain: 'category.seeAgain',
  other: 'category.other',
};

export function ComposePage({ onNavigate, onSaveResult, onDisplayResult }: ComposePageProps) {
  const [direction, setDirection] = useState<LanguageDirection>('ja-to-zh-TW');
  const [sourceText, setSourceText] = useState('');
  const [category, setCategory] = useState<PhraseCategory>('seeAgain');
  const [result, setResult] = useState<ConversationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const { t } = useDisplayLanguage();
  const speechPlayback = useSpeechPlayback();
  const generationIdRef = useRef(0);

  const resultWithCategory = useMemo(
    () => (result ? { ...result, category } : null),
    [category, result],
  );
  const mainSpeechTarget = resultWithCategory ? getMainSpeechTarget(resultWithCategory) : null;
  const originalSpeechTarget = resultWithCategory ? getOriginalSpeechTarget(resultWithCategory) : null;
  const canGenerate = sourceText.trim().length > 0 && !isLoading;

  function selectDirection(nextDirection: LanguageDirection) {
    setDirection(nextDirection);
    setSourceText('');
    setResult(null);
    setSavedNotice('');
    speechPlayback.stop();
  }

  async function generate() {
    if (!sourceText.trim()) {
      setResult(null);
      return;
    }

    const generationId = generationIdRef.current + 1;
    generationIdRef.current = generationId;
    const requestedSourceText = sourceText;
    const requestedDirection = direction;
    const requestedCategory = category;

    setIsLoading(true);
    setSavedNotice('');

    try {
      const nextResult = await conversationService.generate({
        sourceText: requestedSourceText,
        direction: requestedDirection,
        tone: requestedDirection === 'ja-to-zh-TW' ? 'friendly' : 'dm',
        category: requestedCategory,
      });

      if (generationId === generationIdRef.current) {
        setResult(nextResult);
      }
    } finally {
      if (generationId === generationIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function saveResult() {
    if (!resultWithCategory) {
      return;
    }

    await onSaveResult(resultWithCategory);
    setSavedNotice(t('compose.savedNotice'));
  }

  return (
    <div>
      <Header
        title={t('page.compose.title')}
        subtitle={t('page.compose.subtitle')}
        onMenu={() => onNavigate('/settings')}
      />

      <section className="mb-4 grid grid-cols-2 gap-3">
        <button
          aria-pressed={direction === 'ja-to-zh-TW'}
          className={[
            'rounded-[18px] border p-4 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
            direction === 'ja-to-zh-TW'
              ? 'border-[var(--brand-red)] bg-[#fff7f7] text-[var(--brand-red)]'
              : 'border-[#d9e1ee] bg-white text-[#344054]',
          ].join(' ')}
          type="button"
          onClick={() => selectDirection('ja-to-zh-TW')}
        >
          <span className="block text-base font-black">{t('direction.fromJa')}</span>
          <span className="mt-1 block text-xs font-bold text-[#344054]">{t('direction.jaToZh')}</span>
        </button>
        <button
          aria-pressed={direction === 'zh-TW-to-ja'}
          className={[
            'rounded-[18px] border p-4 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
            direction === 'zh-TW-to-ja'
              ? 'border-[var(--brand-blue)] bg-[#eef6ff] text-[var(--brand-blue)]'
              : 'border-[#d9e1ee] bg-white text-[#344054]',
          ].join(' ')}
          type="button"
          onClick={() => selectDirection('zh-TW-to-ja')}
        >
          <span className="block text-base font-black">{t('direction.fromZh')}</span>
          <span className="mt-1 block text-xs font-bold text-[#344054]">{t('direction.zhToJa')}</span>
        </button>
      </section>

      <section className="mb-4">
        <label className="mb-2 block text-sm font-black text-[#141821]" htmlFor="compose-source">
          {direction === 'ja-to-zh-TW' ? t('compose.inputLabelJa') : t('compose.inputLabelZh')}
        </label>
        <p className="mb-2 text-xs font-bold leading-relaxed text-[#667085]">
          {direction === 'ja-to-zh-TW' ? t('compose.helperJa') : t('compose.helperZh')}
        </p>
        <div className="glass-card rounded-[18px] p-3">
          <textarea
            className="min-h-20 w-full resize-none bg-transparent text-[18px] font-bold leading-relaxed text-[#141821] outline-none placeholder:text-[#98a2b3]"
            data-testid="compose-input"
            id="compose-source"
            maxLength={200}
            placeholder={direction === 'ja-to-zh-TW' ? t('compose.placeholderJa') : t('compose.placeholderZh')}
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
          />
          <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#667085]">
            <Mic2 aria-hidden="true" size={20} />
            <span>{sourceText.length} / 200</span>
          </div>
        </div>
      </section>

      <PrimaryButton
        className="mb-4"
        data-testid="compose-generate-button"
        fullWidth
        icon={<Sparkles aria-hidden="true" size={18} />}
        disabled={!canGenerate}
        onClick={generate}
      >
        {isLoading ? t('compose.generating') : t('compose.generate')}
      </PrimaryButton>

      {resultWithCategory ? (
        <section className="phrase-hero mb-4 rounded-[22px] p-4" data-testid="compose-result-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-[#141821]">
              {direction === 'ja-to-zh-TW' ? t('compose.resultZh') : t('compose.resultJa')}
            </h2>
            <span className="rounded-full bg-[var(--brand-red)] px-3 py-1 text-xs font-black text-white">
              {t('compose.recommended')}
            </span>
          </div>
          <p
            className="whitespace-pre-line text-[28px] font-black leading-tight tracking-normal text-[var(--brand-red)]"
            data-testid="compose-result-text"
          >
            {resultWithCategory.resultText}
          </p>
          <div className="mt-4 border-l-4 border-[#f5ae28] pl-3" data-testid="compose-result-nuance">
            <h3 className="text-xs font-black text-[#667085]">{t('compose.nuance')}</h3>
            <p className="mt-1 text-sm font-bold leading-relaxed text-[#344054]">
              {resultWithCategory.nuance}
            </p>
          </div>
          {direction === 'zh-TW-to-ja' && resultWithCategory.literalMeaning ? (
            <div className="mt-3 rounded-[14px] bg-[#f3f6fb] px-3 py-2" data-testid="compose-literal-meaning">
              <h3 className="text-xs font-black text-[#667085]">{t('compose.literalMeaning')}</h3>
              <p className="mt-1 text-sm font-bold leading-relaxed text-[#344054]">
                {resultWithCategory.literalMeaning}
              </p>
            </div>
          ) : null}
          {resultWithCategory.pinyin ? (
            <p
              className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#344054]"
              data-testid="compose-result-pinyin"
            >
              {resultWithCategory.pinyin}
            </p>
          ) : null}
          <p
            className="mt-3 rounded-[14px] bg-white/72 p-3 text-sm font-bold leading-relaxed text-[#344054]"
            data-testid="compose-result-source"
          >
            <span className="mb-1 block text-xs font-black text-[#667085]">{t('compose.originalText')}</span>
            {resultWithCategory.sourceText}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PrimaryButton
              data-speech-language={mainSpeechTarget?.language}
              data-speech-text={mainSpeechTarget?.text}
              data-testid="compose-main-listen"
              icon={<Volume2 aria-hidden="true" size={18} />}
              variant="danger"
              onClick={() => {
                if (!mainSpeechTarget) {
                  return;
                }
                speechPlayback.toggle({
                  phraseId: 'compose-result',
                  text: mainSpeechTarget.text,
                  language: mainSpeechTarget.language,
                  speed: 'normal',
                });
              }}
            >
              {speechPlayback.isLoading('compose-result', 'normal')
                ? t('cta.loading')
                : speechPlayback.isStopping('compose-result', 'normal')
                  ? t('cta.stopping')
                  : resultWithCategory && speechPlayback.isPlaying('compose-result', 'normal')
                    ? t('cta.stop')
                    : t('cta.listen')}
            </PrimaryButton>
            <PrimaryButton
              data-speech-language={mainSpeechTarget?.language}
              data-speech-text={mainSpeechTarget?.text}
              data-testid="compose-main-slow"
              icon={<Play aria-hidden="true" size={18} />}
              variant="soft"
              onClick={() => {
                if (!mainSpeechTarget) {
                  return;
                }
                speechPlayback.toggle({
                  phraseId: 'compose-result',
                  text: mainSpeechTarget.text,
                  language: mainSpeechTarget.language,
                  speed: 'slow',
                });
              }}
            >
              {speechPlayback.isLoading('compose-result', 'slow')
                ? t('cta.loading')
                : speechPlayback.isStopping('compose-result', 'slow')
                  ? t('cta.stopping')
                  : resultWithCategory && speechPlayback.isPlaying('compose-result', 'slow')
                    ? t('cta.stop')
                    : t('cta.slow')}
            </PrimaryButton>
            {originalSpeechTarget ? (
              <PrimaryButton
                className="col-span-2"
                data-speech-language={originalSpeechTarget.language}
                data-speech-text={originalSpeechTarget.text}
                data-testid="compose-original-listen"
                icon={<Volume2 aria-hidden="true" size={18} />}
                variant="soft"
                onClick={() => {
                  speechPlayback.toggle({
                    phraseId: 'compose-original',
                    text: originalSpeechTarget.text,
                    language: originalSpeechTarget.language,
                    speed: 'normal',
                  });
                }}
              >
                {speechPlayback.isLoading('compose-original', 'normal')
                  ? t('cta.loading')
                  : speechPlayback.isStopping('compose-original', 'normal')
                    ? t('cta.stopping')
                    : speechPlayback.isPlaying('compose-original', 'normal')
                      ? t('cta.stop')
                      : t('cta.listenOriginal')}
              </PrimaryButton>
            ) : null}
            <PrimaryButton
              className="col-span-2"
              icon={<Mic2 aria-hidden="true" size={18} />}
              variant="soft"
              onClick={() => onNavigate('/practice')}
            >
              {t('cta.practice')}
            </PrimaryButton>
          </div>
          {speechPlayback.error ? (
            <p className="mt-2 rounded-[12px] bg-white/75 px-3 py-2 text-xs font-bold leading-relaxed text-[#b42318]">
              {speechPlayback.error}
            </p>
          ) : null}
          {speechPlayback.provider === 'browser-fallback' ? (
            <p className="mt-2 rounded-[12px] bg-white/75 px-3 py-2 text-xs font-bold leading-relaxed text-[#b45309]" data-testid="speech-fallback-notice">
              {t('speech.fallbackNotice')}
            </p>
          ) : null}
          <p
            className="mt-3 rounded-[12px] bg-white/70 px-3 py-2 text-xs font-bold leading-relaxed text-[#667085]"
            data-testid="needs-native-check-note"
          >
            {t('ai.needsNativeCheckNote')}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PrimaryButton
              data-testid="compose-save-button"
              fullWidth
              icon={<Bookmark aria-hidden="true" size={18} />}
              onClick={saveResult}
            >
              {t('cta.savePhrase')}
            </PrimaryButton>
            <PrimaryButton
              data-testid="compose-display-button"
              fullWidth
              variant="blue"
              onClick={() => onDisplayResult(resultWithCategory)}
            >
              {t('cta.largeDisplay')}
            </PrimaryButton>
          </div>
          {savedNotice ? (
            <p className="mt-2 text-center text-sm font-black text-[var(--brand-red)]">{savedNotice}</p>
          ) : null}
        </section>
      ) : null}

      {resultWithCategory?.alternatives ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-black text-[#141821]">{t('compose.alternatives')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {resultWithCategory.alternatives.map((alternative) => (
              <article key={alternative.label} className="glass-card rounded-[18px] p-3">
                <p className="mb-2 text-xs font-black text-[var(--brand-blue)]">{alternative.label}</p>
                <p className="whitespace-pre-line text-base font-black leading-snug text-[#141821]">
                  {alternative.resultText}
                </p>
                {alternative.pinyin ? (
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-[#667085]">
                    {alternative.pinyin}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {direction === 'ja-to-zh-TW' && !resultWithCategory ? (
        <section className="soft-blue mb-4 rounded-[18px] p-4">
          <div className="flex gap-3">
            <Lightbulb aria-hidden="true" className="mt-1 text-[#f59e0b]" size={24} />
            <div>
              <h2 className="text-sm font-black text-[#141821]">{t('compose.nuance')}</h2>
              <p className="mt-1 text-sm font-bold leading-relaxed text-[#344054]">
                {t('compose.defaultNuance')}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-black text-[#141821]">{t('compose.categorySave')}</h2>
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((item) => (
            <Chip key={item} selected={item === category} onClick={() => setCategory(item)}>
              {t(categoryKey[item])}
            </Chip>
          ))}
          <Chip>{t('compose.newCategory')}</Chip>
        </div>
      </section>
    </div>
  );
}

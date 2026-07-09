import { useMemo, useState } from 'react';
import { ArrowRight, Languages } from 'lucide-react';
import { presetPhrases } from '../../data/presets';
import { Header } from '../../components/Header';
import { PhraseCard } from '../../components/PhraseCard';
import type { LanguageDirection, Phrase, PhraseCategory } from '../../lib/conversation/types';
import { toDirectionPhrase } from '../../lib/conversation/phraseDisplay';
import { useDisplayLanguage } from '../../lib/displayLanguage/DisplayLanguageProvider';
import type { TranslationKey } from '../../lib/displayLanguage/types';

type HomePageProps = {
  savedPhrases: Phrase[];
  onNavigate: (path: string) => void;
  onDisplay: (phrase: Phrase) => void;
  onPractice: (phrase: Phrase) => void;
  onFavorite: (phrase: Phrase) => void;
};

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

export function HomePage({
  savedPhrases,
  onNavigate,
  onDisplay,
  onPractice,
  onFavorite,
}: HomePageProps) {
  const [direction, setDirection] = useState<LanguageDirection>('ja-to-zh-TW');
  const { t } = useDisplayLanguage();
  const recommended = useMemo(
    () => toDirectionPhrase(savedPhrases.find((phrase) => phrase.id === presetPhrases[0].id) ?? presetPhrases[0], direction),
    [direction, savedPhrases],
  );
  const recentPhrases = useMemo(
    () =>
      (savedPhrases.length > 0 ? savedPhrases.slice(0, 4) : presetPhrases.slice(1, 5)).map((phrase) =>
        toDirectionPhrase(phrase, direction),
      ),
    [direction, savedPhrases],
  );
  const directionOptions: Array<{ value: LanguageDirection; label: string; tone: 'red' | 'blue' }> = [
    { value: 'ja-to-zh-TW', label: t('direction.jaToZh'), tone: 'red' },
    { value: 'zh-TW-to-ja', label: t('direction.zhToJa'), tone: 'blue' },
  ];

  return (
    <div>
      <Header
        title={t('page.home.title')}
        subtitle={t('page.home.subtitle')}
        onMenu={() => onNavigate('/settings')}
      />

      <section className="mb-5 rounded-[20px] border border-[#d9e1ee] bg-white p-3 shadow-[0_10px_26px_rgba(18,35,64,0.06)]">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#667085]">
          <Languages aria-hidden="true" size={18} />
          <span>{t('direction.label')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm font-black">
          {directionOptions.map((item) => {
            const selected = direction === item.value;

            return (
              <button
                key={item.value}
                aria-pressed={selected}
                className={[
                  'min-h-12 rounded-[14px] border px-3 text-center whitespace-nowrap transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
                  selected && item.tone === 'red'
                    ? 'border-[var(--brand-red)] bg-[#fff7f7] text-[var(--brand-red)]'
                    : '',
                  selected && item.tone === 'blue'
                    ? 'border-[var(--brand-blue)] bg-[#eef6ff] text-[var(--brand-blue)]'
                    : '',
                  selected ? '' : 'border-[#d9e1ee] bg-white text-[#344054]',
                ].join(' ')}
                type="button"
                onClick={() => setDirection(item.value)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-black text-[#141821]">{t('home.recommended')}</h2>
          <button
            className="flex items-center gap-1 text-xs font-bold text-[#344054]"
            type="button"
            onClick={() => onNavigate('/saved')}
          >
            {t('cta.viewAll')}
            <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>
        <PhraseCard
          phrase={recommended}
          onDisplay={onDisplay}
          onFavorite={onFavorite}
          onPractice={onPractice}
        />
      </section>

      <section className="rounded-[20px] border border-[#d9e1ee] bg-white px-3 shadow-[0_10px_26px_rgba(18,35,64,0.05)]">
        <div className="flex items-center justify-between border-b border-[#edf1f7] py-3">
          <div>
            <h2 className="text-base font-black text-[#141821]">{t('home.recent')}</h2>
            <p className="mt-0.5 text-xs font-bold text-[#667085]">
              {savedPhrases.length ? t('home.recentSaved') : t('home.recentPreset')}
            </p>
          </div>
          <span className="rounded-full bg-[#f3f6fb] px-3 py-1 text-xs font-bold text-[#344054]">
            {t(categoryKey[recentPhrases[0]?.category ?? 'other'])}
          </span>
        </div>
        {recentPhrases.map((phrase) => (
          <PhraseCard
            key={phrase.id}
            compact
            phrase={phrase}
            onDisplay={onDisplay}
            onFavorite={onFavorite}
          />
        ))}
      </section>
    </div>
  );
}

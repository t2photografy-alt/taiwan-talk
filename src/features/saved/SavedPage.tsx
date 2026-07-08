import { useMemo, useState } from 'react';
import { Clipboard, Maximize2, Mic2, Search, Trash2 } from 'lucide-react';
import { Chip } from '../../components/Chip';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { categoryLabels } from '../../data/presets';
import type { Phrase, PhraseCategory } from '../../lib/conversation/types';

type SavedPageProps = {
  savedPhrases: Phrase[];
  onNavigate: (path: string) => void;
  onDisplay: (phrase: Phrase) => void;
  onPractice: (phrase: Phrase) => void;
  onCopy: (text: string) => void;
  onDelete: (phrase: Phrase) => void;
  onFavorite: (phrase: Phrase) => void;
};

const categoryFilters: Array<PhraseCategory | 'all'> = [
  'all',
  'greeting',
  'seeAgain',
  'thanks',
  'photo',
  'event',
  'oshi',
  'other',
];

const filterLabels: Record<PhraseCategory | 'all', string> = {
  all: '全部',
  ...categoryLabels,
};

export function SavedPage({
  savedPhrases,
  onNavigate,
  onDisplay,
  onPractice,
  onCopy,
  onDelete,
  onFavorite,
}: SavedPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PhraseCategory | 'all'>('all');

  const filteredPhrases = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return savedPhrases.filter((phrase) => {
      const matchesCategory = category === 'all' || phrase.category === category;
      const matchesQuery =
        loweredQuery.length === 0 ||
        [phrase.sourceText, phrase.resultText, phrase.pinyin ?? '', phrase.note ?? '']
          .join(' ')
          .toLowerCase()
          .includes(loweredQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query, savedPhrases]);

  return (
    <div>
      <Header
        title="保存"
        subtitle="よく使う言い方を、すぐ見返す"
        onMenu={() => onNavigate('/settings')}
      />

      <section className="mb-4 rounded-[18px] border border-[#d9e1ee] bg-white px-3 py-2 shadow-[0_10px_26px_rgba(18,35,64,0.05)]">
        <label className="flex items-center gap-2" htmlFor="saved-search">
          <Search aria-hidden="true" className="text-[#667085]" size={20} />
          <input
            className="min-h-11 w-full bg-transparent text-base font-bold text-[#141821] outline-none placeholder:text-[#98a2b3]"
            id="saved-search"
            placeholder="保存フレーズを検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {categoryFilters.map((item) => (
          <Chip key={item} selected={category === item} className="shrink-0" onClick={() => setCategory(item)}>
            {filterLabels[item]}
          </Chip>
        ))}
      </section>

      {filteredPhrases.length === 0 ? (
        <section className="glass-card rounded-[22px] p-6 text-center">
          <h2 className="text-lg font-black text-[#141821]">まだ保存がありません</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#667085]">
            作る画面で自然な言い方を作って保存すると、ここからすぐ見返せます。
          </p>
          <PrimaryButton className="mt-4" variant="blue" onClick={() => onNavigate('/compose')}>
            作るへ
          </PrimaryButton>
        </section>
      ) : (
        <section className="space-y-3">
          {filteredPhrases.map((phrase) => (
            <article key={phrase.id} className="glass-card rounded-[20px] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-black text-[var(--brand-blue)]">
                    {categoryLabels[phrase.category]}
                  </span>
                  <h2 className="mt-3 whitespace-pre-line text-[22px] font-black leading-tight tracking-normal text-[var(--brand-red)]">
                    {phrase.resultText}
                  </h2>
                  {phrase.pinyin ? (
                    <p className="mt-1 whitespace-pre-line text-sm font-semibold text-[#344054]">
                      {phrase.pinyin}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-bold text-[#667085]">{phrase.sourceText}</p>
                </div>
                <button
                  aria-label={phrase.isFavorite ? 'お気に入り解除' : 'お気に入り'}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#f5ae28] active:bg-[#fff7e6]"
                  type="button"
                  onClick={() => onFavorite(phrase)}
                >
                  ★
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PrimaryButton
                  icon={<Clipboard aria-hidden="true" size={18} />}
                  variant="soft"
                  onClick={() => onCopy(phrase.resultText)}
                >
                  コピー
                </PrimaryButton>
                <PrimaryButton
                  icon={<Maximize2 aria-hidden="true" size={18} />}
                  variant="soft"
                  onClick={() => onDisplay(phrase)}
                >
                  大きく表示
                </PrimaryButton>
                <PrimaryButton
                  icon={<Mic2 aria-hidden="true" size={18} />}
                  variant="blue"
                  onClick={() => onPractice(phrase)}
                >
                  練習する
                </PrimaryButton>
                <PrimaryButton
                  icon={<Trash2 aria-hidden="true" size={18} />}
                  variant="danger"
                  onClick={() => onDelete(phrase)}
                >
                  削除
                </PrimaryButton>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

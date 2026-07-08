import { ArrowRight, Languages } from 'lucide-react';
import { categoryLabels, presetPhrases } from '../../data/presets';
import { Header } from '../../components/Header';
import { PhraseCard } from '../../components/PhraseCard';
import type { Phrase } from '../../lib/conversation/types';

type HomePageProps = {
  savedPhrases: Phrase[];
  onNavigate: (path: string) => void;
  onDisplay: (phrase: Phrase) => void;
  onPractice: (phrase: Phrase) => void;
  onFavorite: (phrase: Phrase) => void;
};

export function HomePage({
  savedPhrases,
  onNavigate,
  onDisplay,
  onPractice,
  onFavorite,
}: HomePageProps) {
  const recommended =
    savedPhrases.find((phrase) => phrase.id === presetPhrases[0].id) ?? presetPhrases[0];
  const recentPhrases = savedPhrases.length > 0 ? savedPhrases.slice(0, 4) : presetPhrases.slice(1, 5);

  return (
    <div>
      <Header
        title="使う"
        subtitle="登録フレーズをすぐに使う"
        onMenu={() => onNavigate('/settings')}
      />

      <section className="mb-5 rounded-[20px] border border-[#d9e1ee] bg-white p-3 shadow-[0_10px_26px_rgba(18,35,64,0.06)]">
        <div className="grid grid-cols-[1fr_38px_1fr_34px] items-center gap-2 text-sm font-black">
          <div className="flex items-center gap-2 rounded-[14px] bg-[#fff7f7] px-3 py-3 text-[#141821]">
            <span className="h-3.5 w-3.5 rounded-full bg-[var(--brand-red)]" />
            日本語
          </div>
          <ArrowRight aria-hidden="true" className="mx-auto text-[#141821]" size={20} />
          <div className="rounded-[14px] bg-[#eef6ff] px-3 py-3 text-center text-[#141821]">
            台湾華語
          </div>
          <Languages aria-hidden="true" className="text-[#344054]" size={21} />
        </div>
      </section>

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-black text-[#141821]">おすすめフレーズ</h2>
          <button
            className="flex items-center gap-1 text-xs font-bold text-[#344054]"
            type="button"
            onClick={() => onNavigate('/saved')}
          >
            すべて見る
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
            <h2 className="text-base font-black text-[#141821]">最近使ったフレーズ</h2>
            <p className="mt-0.5 text-xs font-bold text-[#667085]">
              {savedPhrases.length ? '保存済みから新しい順に表示' : 'まず使いやすい仮文を表示'}
            </p>
          </div>
          <span className="rounded-full bg-[#f3f6fb] px-3 py-1 text-xs font-bold text-[#344054]">
            {categoryLabels[recentPhrases[0]?.category ?? 'other']}
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

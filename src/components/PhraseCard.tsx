import {
  Bookmark,
  BookmarkCheck,
  Clock3,
  Heart,
  Maximize2,
  Mic2,
  Star,
  Volume2,
} from 'lucide-react';
import type { Phrase } from '../lib/conversation/types';
import { PrimaryButton } from './PrimaryButton';

type PhraseCardProps = {
  phrase: Phrase;
  label?: string;
  compact?: boolean;
  saved?: boolean;
  onDisplay?: (phrase: Phrase) => void;
  onPractice?: (phrase: Phrase) => void;
  onSave?: (phrase: Phrase) => void;
  onFavorite?: (phrase: Phrase) => void;
};

export function PhraseCard({
  phrase,
  label = 'おすすめ',
  compact = false,
  saved = false,
  onDisplay,
  onPractice,
  onSave,
  onFavorite,
}: PhraseCardProps) {
  if (compact) {
    return (
      <article className="grid grid-cols-[1fr_36px] items-center gap-3 border-b border-[#edf1f7] py-3 last:border-b-0">
        <button className="min-w-0 text-left" type="button" onClick={() => onDisplay?.(phrase)}>
          <h3 className="truncate text-[15px] font-black text-[#141821]">{phrase.sourceText}</h3>
          <p className="mt-1 truncate text-sm font-bold text-[#141821]">{phrase.resultText.replace('\n', ' ')}</p>
        </button>
        <button
          aria-label={phrase.isFavorite ? 'お気に入り解除' : 'お気に入り'}
          className="grid h-9 w-9 place-items-center rounded-full text-[#aab4c4] transition active:bg-[#f3f6fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          title="お気に入り"
          type="button"
          onClick={() => onFavorite?.(phrase)}
        >
          <Heart
            aria-hidden="true"
            fill={phrase.isFavorite ? '#ef1f24' : 'none'}
            size={20}
            strokeWidth={2.2}
            className={phrase.isFavorite ? 'text-[var(--brand-red)]' : ''}
          />
        </button>
      </article>
    );
  }

  return (
    <article className="phrase-hero rounded-[22px] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-full bg-[var(--brand-red)] px-3 py-1 text-xs font-black text-white">
          {label}
        </span>
        <button
          aria-label={phrase.isFavorite ? 'お気に入り解除' : 'お気に入り'}
          className="grid h-9 w-9 place-items-center rounded-full text-[#f5ae28] transition active:bg-white/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          title="お気に入り"
          type="button"
          onClick={() => onFavorite?.(phrase)}
        >
          <Star
            aria-hidden="true"
            fill={phrase.isFavorite ? '#f5ae28' : 'none'}
            size={22}
            strokeWidth={2.2}
          />
        </button>
      </div>
      <div className="min-w-0">
        <p className="whitespace-pre-line text-[21px] font-black leading-relaxed text-[#141821]">
          {phrase.sourceText}
        </p>
        <p className="mt-4 whitespace-pre-line text-[28px] font-black leading-tight tracking-normal text-[var(--brand-red)]">
          {phrase.resultText}
        </p>
        {phrase.pinyin ? (
          <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#344054]">
            {phrase.pinyin}
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PrimaryButton icon={<Volume2 aria-hidden="true" size={18} />} variant="danger">
          聞く
        </PrimaryButton>
        <PrimaryButton icon={<Clock3 aria-hidden="true" size={18} />} variant="soft">
          ゆっくり
        </PrimaryButton>
        <PrimaryButton
          icon={<Maximize2 aria-hidden="true" size={18} />}
          variant="soft"
          onClick={() => onDisplay?.(phrase)}
        >
          大きく表示
        </PrimaryButton>
        <PrimaryButton
          icon={<Mic2 aria-hidden="true" size={18} />}
          variant="soft"
          onClick={() => onPractice?.(phrase)}
        >
          練習する
        </PrimaryButton>
      </div>
      {onSave ? (
        <PrimaryButton
          className="mt-3"
          fullWidth
          icon={
            saved ? (
              <BookmarkCheck aria-hidden="true" size={18} />
            ) : (
              <Bookmark aria-hidden="true" size={18} />
            )
          }
          onClick={() => onSave(phrase)}
        >
          {saved ? '保存済み' : '保存する'}
        </PrimaryButton>
      ) : null}
    </article>
  );
}

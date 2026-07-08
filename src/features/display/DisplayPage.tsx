import { ArrowLeft, Bookmark, Check, Clipboard, Mic2 } from 'lucide-react';
import { DarumaLogo } from '../../components/DarumaLogo';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { Phrase } from '../../lib/conversation/types';

type DisplayPageProps = {
  phrase?: Phrase;
  isSaved: boolean;
  onBack: () => void;
  onCopy: (text: string) => void;
  onSave: (phrase: Phrase) => Promise<void>;
  onPractice: (phrase: Phrase) => void;
};

export function DisplayPage({ phrase, isSaved, onBack, onCopy, onSave, onPractice }: DisplayPageProps) {
  if (!phrase) {
    return (
      <div className="flex min-h-[72dvh] flex-col items-center justify-center text-center">
        <h1 className="text-xl font-black text-[#141821]">フレーズが見つかりません</h1>
        <PrimaryButton className="mt-5" variant="blue" onClick={onBack}>
          戻る
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-52px)] flex-col">
      <header className="mb-5 flex items-center justify-between">
        <button
          aria-label="戻る"
          className="grid h-11 w-11 place-items-center rounded-full border border-[#d9e1ee] bg-white text-[#141821] shadow-[0_10px_24px_rgba(18,35,64,0.08)]"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={22} />
        </button>
        <div className="flex items-center gap-2">
          <DarumaLogo className="h-9 w-9" size="sm" />
          <span className="text-sm font-black tracking-normal">
            <span className="text-[var(--brand-red)]">Taiwan</span>{' '}
            <span className="text-[var(--brand-blue)]">Talk</span>
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center">
        <section className="rounded-[26px] border border-[#d9e1ee] bg-white p-6 text-center shadow-[0_20px_52px_rgba(18,35,64,0.1)]">
          <span
            className={[
              'mb-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black',
              isSaved ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fff7e6] text-[#b45309]',
            ].join(' ')}
          >
            {isSaved ? <Check aria-hidden="true" size={14} /> : <Bookmark aria-hidden="true" size={14} />}
            {isSaved ? '保存済み' : 'まだ保存していません'}
          </span>
          <h1 className="display-kanji whitespace-pre-line font-black tracking-normal text-[#141821]">
            {phrase.resultText}
          </h1>
          {phrase.pinyin ? (
            <p className="mt-6 whitespace-pre-line text-lg font-bold leading-relaxed text-[var(--brand-blue)]">
              {phrase.pinyin}
            </p>
          ) : null}
          <p className="mt-6 rounded-[18px] bg-[#f3f6fb] p-4 text-base font-bold leading-relaxed text-[#344054]">
            {phrase.sourceText}
          </p>
        </section>
      </main>

      <footer className="mt-5 grid grid-cols-3 gap-2">
        <PrimaryButton
          icon={<Clipboard aria-hidden="true" size={18} />}
          variant="soft"
          onClick={() => onCopy(phrase.resultText)}
        >
          コピー
        </PrimaryButton>
        <PrimaryButton
          icon={<Bookmark aria-hidden="true" size={18} />}
          onClick={() => {
            void onSave(phrase);
          }}
        >
          保存
        </PrimaryButton>
        <PrimaryButton icon={<Mic2 aria-hidden="true" size={18} />} variant="blue" onClick={() => onPractice(phrase)}>
          練習
        </PrimaryButton>
      </footer>
    </div>
  );
}

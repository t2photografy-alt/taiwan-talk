import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Lightbulb, Mic2, Play, Sparkles, Volume2 } from 'lucide-react';
import { Chip } from '../../components/Chip';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { categoryLabels } from '../../data/presets';
import { conversationService } from '../../lib/conversation/conversationService';
import type {
  ConversationResult,
  LanguageDirection,
  PhraseCategory,
} from '../../lib/conversation/types';

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

export function ComposePage({ onNavigate, onSaveResult, onDisplayResult }: ComposePageProps) {
  const [direction, setDirection] = useState<LanguageDirection>('ja-to-zh-TW');
  const [sourceText, setSourceText] = useState('久しぶり〜ほんと会いたかったよ！');
  const [category, setCategory] = useState<PhraseCategory>('seeAgain');
  const [result, setResult] = useState<ConversationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  const resultWithCategory = useMemo(
    () => (result ? { ...result, category } : null),
    [category, result],
  );

  async function generate() {
    setIsLoading(true);
    setSavedNotice('');
    const nextResult = await conversationService.generate({
      sourceText,
      direction,
      tone: direction === 'ja-to-zh-TW' ? 'friendly' : 'dm',
      category,
    });
    setResult(nextResult);
    setIsLoading(false);
  }

  useEffect(() => {
    void generate();
  }, []);

  async function saveResult() {
    if (!resultWithCategory) {
      return;
    }

    await onSaveResult(resultWithCategory);
    setSavedNotice('保存しました');
  }

  return (
    <div>
      <Header
        title="作る"
        subtitle="話したいことを、自然な言い方に"
        onMenu={() => onNavigate('/settings')}
      />

      <section className="mb-4 grid grid-cols-2 gap-3">
        <button
          className={[
            'rounded-[18px] border p-4 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
            direction === 'ja-to-zh-TW'
              ? 'border-[var(--brand-red)] bg-[#fff7f7] text-[var(--brand-red)]'
              : 'border-[#d9e1ee] bg-white text-[#344054]',
          ].join(' ')}
          type="button"
          onClick={() => setDirection('ja-to-zh-TW')}
        >
          <span className="block text-base font-black">日本語から</span>
          <span className="mt-1 block text-xs font-bold text-[#344054]">日本語 → 台湾華語</span>
        </button>
        <button
          className={[
            'rounded-[18px] border p-4 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
            direction === 'zh-TW-to-ja'
              ? 'border-[var(--brand-blue)] bg-[#eef6ff] text-[var(--brand-blue)]'
              : 'border-[#d9e1ee] bg-white text-[#344054]',
          ].join(' ')}
          type="button"
          onClick={() => setDirection('zh-TW-to-ja')}
        >
          <span className="block text-base font-black">台湾華語から</span>
          <span className="mt-1 block text-xs font-bold text-[#344054]">台湾華語 → 日本語</span>
        </button>
      </section>

      <section className="mb-4">
        <label className="mb-2 block text-sm font-black text-[#141821]" htmlFor="compose-source">
          話したいこと（{direction === 'ja-to-zh-TW' ? '日本語' : '台湾華語'}）
        </label>
        <div className="glass-card rounded-[18px] p-3">
          <textarea
            className="min-h-20 w-full resize-none bg-transparent text-[18px] font-bold leading-relaxed text-[#141821] outline-none placeholder:text-[#98a2b3]"
            id="compose-source"
            maxLength={200}
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
        fullWidth
        icon={<Sparkles aria-hidden="true" size={18} />}
        onClick={generate}
      >
        {isLoading ? '整えています...' : '自然な言い方にする'}
      </PrimaryButton>

      {resultWithCategory ? (
        <section className="phrase-hero mb-4 rounded-[22px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-[#141821]">
              {direction === 'ja-to-zh-TW' ? '友達トーンの台湾華語' : '自然な日本語'}
            </h2>
            <span className="rounded-full bg-[var(--brand-red)] px-3 py-1 text-xs font-black text-white">
              おすすめ
            </span>
          </div>
          <p className="whitespace-pre-line text-[28px] font-black leading-tight tracking-normal text-[var(--brand-red)]">
            {resultWithCategory.resultText}
          </p>
          {resultWithCategory.pinyin ? (
            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#344054]">
              {resultWithCategory.pinyin}
            </p>
          ) : null}
          <p className="mt-3 rounded-[14px] bg-white/72 p-3 text-sm font-bold leading-relaxed text-[#344054]">
            {resultWithCategory.sourceText}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PrimaryButton icon={<Volume2 aria-hidden="true" size={18} />} variant="danger">
              聞く
            </PrimaryButton>
            <PrimaryButton icon={<Play aria-hidden="true" size={18} />} variant="soft">
              ゆっくり
            </PrimaryButton>
            <PrimaryButton
              className="col-span-2"
              icon={<Mic2 aria-hidden="true" size={18} />}
              variant="soft"
              onClick={() => onNavigate('/practice')}
            >
              練習する
            </PrimaryButton>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PrimaryButton
              fullWidth
              icon={<Bookmark aria-hidden="true" size={18} />}
              onClick={saveResult}
            >
              保存する
            </PrimaryButton>
            <PrimaryButton fullWidth variant="blue" onClick={() => onDisplayResult(resultWithCategory)}>
              大きく表示
            </PrimaryButton>
          </div>
          {savedNotice ? (
            <p className="mt-2 text-center text-sm font-black text-[var(--brand-red)]">{savedNotice}</p>
          ) : null}
        </section>
      ) : null}

      {resultWithCategory?.alternatives ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-black text-[#141821]">別の言い方</h2>
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

      <section className="soft-blue mb-4 rounded-[18px] p-4">
        <div className="flex gap-3">
          <Lightbulb aria-hidden="true" className="mt-1 text-[#f59e0b]" size={24} />
          <div>
            <h2 className="text-sm font-black text-[#141821]">ニュアンス</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-[#344054]">
              {resultWithCategory?.nuance ??
                '完璧な翻訳ではなく、会話のきっかけを作るための補助です。'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-black text-[#141821]">カテゴリに保存</h2>
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((item) => (
            <Chip key={item} selected={item === category} onClick={() => setCategory(item)}>
              {categoryLabels[item]}
            </Chip>
          ))}
          <Chip>＋ 新しいカテゴリ</Chip>
        </div>
      </section>
    </div>
  );
}

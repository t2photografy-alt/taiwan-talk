import { useEffect, useState } from 'react';
import { Clipboard, Maximize2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { Chip } from '../../components/Chip';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';
import { conversationService } from '../../lib/conversation/conversationService';
import type {
  ConversationResult,
  MessageAnalysis,
  ReplyIntent,
} from '../../lib/conversation/types';
import { useDisplayLanguage } from '../../lib/displayLanguage/DisplayLanguageProvider';

type MessagesPageProps = {
  onNavigate: (path: string) => void;
  onSaveResult: (result: ConversationResult) => Promise<void>;
  onDisplayResult: (result: ConversationResult) => void;
  onCopy: (text: string) => void;
};

const replyIntents: Array<{ id: ReplyIntent; label: string }> = [
  { id: 'happy', label: 'うれしい' },
  { id: 'thanks', label: 'ありがとう' },
  { id: 'seeAgain', label: 'また会いたい' },
  { id: 'askSchedule', label: '予定を聞きたい' },
  { id: 'softDecline', label: 'やんわり断る' },
  { id: 'sendPhoto', label: '写真を送る' },
];

export function MessagesPage({
  onNavigate,
  onSaveResult,
  onDisplayResult,
  onCopy,
}: MessagesPageProps) {
  const [incomingText, setIncomingText] = useState('謝謝你今天來看表演～');
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null);
  const [intent, setIntent] = useState<ReplyIntent>('happy');
  const [reply, setReply] = useState<ConversationResult | null>(null);
  const [notice, setNotice] = useState('');
  const { t } = useDisplayLanguage();

  async function analyze() {
    const nextAnalysis = await conversationService.analyzeMessage(incomingText);
    setAnalysis(nextAnalysis);
    setNotice('');
  }

  async function createReply(nextIntent = intent) {
    const nextReply = await conversationService.createReply({
      incomingText,
      intent: nextIntent,
      tone: 'dm',
    });
    setReply(nextReply);
    setNotice('');
  }

  useEffect(() => {
    void analyze();
    void createReply('happy');
  }, []);

  async function saveReply() {
    if (!reply) {
      return;
    }

    await onSaveResult(reply);
    setNotice('返信候補を保存しました');
  }

  return (
    <div>
      <Header
        title={t('page.messages.title')}
        subtitle={t('page.messages.subtitle')}
        onMenu={() => onNavigate('/settings')}
      />

      <section className="mb-4">
        <label className="mb-2 block text-sm font-black text-[#141821]" htmlFor="message-source">
          相手から来たメッセージ
        </label>
        <div className="glass-card rounded-[18px] p-3">
          <textarea
            className="min-h-24 w-full resize-none bg-transparent text-[17px] font-bold leading-relaxed text-[#141821] outline-none"
            id="message-source"
            value={incomingText}
            onChange={(event) => setIncomingText(event.target.value)}
          />
        </div>
        <PrimaryButton
          className="mt-3"
          fullWidth
          icon={<Sparkles aria-hidden="true" size={18} />}
          onClick={() => {
            void analyze();
            void createReply();
          }}
        >
          意味を確認
        </PrimaryButton>
      </section>

      {analysis ? (
        <section className="soft-blue mb-4 rounded-[18px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle aria-hidden="true" className="text-[var(--brand-blue)]" size={20} />
            <h2 className="text-sm font-black text-[#141821]">だいたいの意味</h2>
          </div>
          <p className="text-[17px] font-black leading-relaxed text-[#141821]">{analysis.summaryJa}</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#344054]">{analysis.nuance}</p>
          <div className="mt-3 h-2 rounded-full bg-[#d9e1ee]">
            <div
              className="h-2 rounded-full bg-[var(--brand-blue)]"
              style={{ width: `${Math.round(analysis.confidence * 100)}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-black text-[#141821]">返信方針</h2>
        <div className="flex flex-wrap gap-2">
          {replyIntents.map((item) => (
            <Chip
              key={item.id}
              selected={intent === item.id}
              onClick={() => {
                setIntent(item.id);
                void createReply(item.id);
              }}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </section>

      {reply ? (
        <section className="phrase-hero rounded-[22px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-[#141821]">返信候補</h2>
            <span className="rounded-full bg-[var(--brand-red)] px-3 py-1 text-xs font-black text-white">
              DM向け
            </span>
          </div>
          <p className="whitespace-pre-line text-[26px] font-black leading-tight tracking-normal text-[var(--brand-red)]">
            {reply.resultText}
          </p>
          {reply.pinyin ? (
            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#344054]">
              {reply.pinyin}
            </p>
          ) : null}
          <p className="mt-3 rounded-[14px] bg-white/72 p-3 text-sm font-bold leading-relaxed text-[#344054]">
            {reply.sourceText}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PrimaryButton
              icon={<Clipboard aria-hidden="true" size={18} />}
              variant="soft"
              onClick={() => onCopy(reply.resultText)}
            >
              コピー
            </PrimaryButton>
            <PrimaryButton icon={<Send aria-hidden="true" size={18} />} onClick={saveReply}>
              {t('cta.save')}
            </PrimaryButton>
            <PrimaryButton
              icon={<Maximize2 aria-hidden="true" size={18} />}
              variant="blue"
              fullWidth
              className="col-span-2"
              onClick={() => onDisplayResult(reply)}
            >
              {t('cta.largeDisplay')}
            </PrimaryButton>
          </div>
          <p className="mt-3 rounded-[12px] bg-white/70 px-3 py-2 text-xs font-bold leading-relaxed text-[#667085]">
            AI生成結果は確認前の表現です。必要に応じて相手や場面に合わせて調整してください。
          </p>
          {notice ? <p className="mt-2 text-center text-sm font-black text-[var(--brand-red)]">{notice}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

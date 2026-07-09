import { useRef, useState } from 'react';
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
import type { TranslationKey } from '../../lib/displayLanguage/types';

type MessagesPageProps = {
  onNavigate: (path: string) => void;
  onSaveResult: (result: ConversationResult) => Promise<void>;
  onDisplayResult: (result: ConversationResult) => void;
  onCopy: (text: string) => void;
};

const replyIntents: Array<{ id: ReplyIntent; labelKey: TranslationKey }> = [
  { id: 'happy', labelKey: 'intent.happy' },
  { id: 'thanks', labelKey: 'intent.thanks' },
  { id: 'seeAgain', labelKey: 'intent.seeAgain' },
  { id: 'askSchedule', labelKey: 'intent.askSchedule' },
  { id: 'softDecline', labelKey: 'intent.softDecline' },
  { id: 'sendPhoto', labelKey: 'intent.sendPhoto' },
];

export function MessagesPage({
  onNavigate,
  onSaveResult,
  onDisplayResult,
  onCopy,
}: MessagesPageProps) {
  const [incomingText, setIncomingText] = useState('');
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null);
  const [intent, setIntent] = useState<ReplyIntent>('happy');
  const [reply, setReply] = useState<ConversationResult | null>(null);
  const [notice, setNotice] = useState('');
  const { t } = useDisplayLanguage();
  const replyRequestIdRef = useRef(0);

  async function analyze() {
    const nextAnalysis = await conversationService.analyzeMessage(incomingText);
    setAnalysis(nextAnalysis);
    setNotice('');
  }

  async function createReply(nextIntent = intent) {
    const requestId = replyRequestIdRef.current + 1;
    replyRequestIdRef.current = requestId;
    const requestedText = incomingText;

    const nextReply = await conversationService.createReply({
      incomingText: requestedText,
      intent: nextIntent,
      tone: 'dm',
    });

    if (requestId === replyRequestIdRef.current) {
      setReply(nextReply);
      setNotice('');
    }
  }

  async function saveReply() {
    if (!reply) {
      return;
    }

    await onSaveResult(reply);
    setNotice(t('messages.savedNotice'));
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
          {t('messages.inputLabel')}
        </label>
        <div className="glass-card rounded-[18px] p-3">
          <textarea
            className="min-h-24 w-full resize-none bg-transparent text-[17px] font-bold leading-relaxed text-[#141821] outline-none placeholder:text-[#98a2b3]"
            data-testid="messages-input"
            id="message-source"
            placeholder={t('messages.placeholder')}
            value={incomingText}
            onChange={(event) => {
              setIncomingText(event.target.value);
              setAnalysis(null);
              setReply(null);
              setNotice('');
            }}
          />
        </div>
        <PrimaryButton
          className="mt-3"
          data-testid="messages-check-button"
          fullWidth
          icon={<Sparkles aria-hidden="true" size={18} />}
          onClick={() => {
            void analyze();
            void createReply();
          }}
        >
          {t('messages.checkMeaning')}
        </PrimaryButton>
      </section>

      {analysis ? (
        <section className="soft-blue mb-4 rounded-[18px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle aria-hidden="true" className="text-[var(--brand-blue)]" size={20} />
            <h2 className="text-sm font-black text-[#141821]">{t('messages.meaning')}</h2>
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
        <h2 className="mb-2 text-sm font-black text-[#141821]">{t('messages.replyPolicy')}</h2>
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
              {t(item.labelKey)}
            </Chip>
          ))}
        </div>
      </section>

      {reply ? (
        <section className="phrase-hero rounded-[22px] p-4" data-testid="messages-reply-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-[#141821]">{t('messages.replyCandidate')}</h2>
            <span className="rounded-full bg-[var(--brand-red)] px-3 py-1 text-xs font-black text-white">
              {t('messages.dm')}
            </span>
          </div>
          <p
            className="whitespace-pre-line text-[26px] font-black leading-tight tracking-normal text-[var(--brand-red)]"
            data-testid="messages-reply-text"
          >
            {reply.resultText}
          </p>
          {reply.pinyin ? (
            <p
              className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#344054]"
              data-testid="messages-reply-pinyin"
            >
              {reply.pinyin}
            </p>
          ) : null}
          <p
            className="mt-3 rounded-[14px] bg-white/72 p-3 text-sm font-bold leading-relaxed text-[#344054]"
            data-testid="messages-reply-source"
          >
            {reply.sourceText}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PrimaryButton
              icon={<Clipboard aria-hidden="true" size={18} />}
              variant="soft"
              onClick={() => onCopy(reply.resultText)}
            >
              {t('cta.copy')}
            </PrimaryButton>
            <PrimaryButton
              data-testid="messages-save-button"
              icon={<Send aria-hidden="true" size={18} />}
              onClick={saveReply}
            >
              {t('cta.save')}
            </PrimaryButton>
            <PrimaryButton
              data-testid="messages-display-button"
              icon={<Maximize2 aria-hidden="true" size={18} />}
              variant="blue"
              fullWidth
              className="col-span-2"
              onClick={() => onDisplayResult(reply)}
            >
              {t('cta.largeDisplay')}
            </PrimaryButton>
          </div>
          <p
            className="mt-3 rounded-[12px] bg-white/70 px-3 py-2 text-xs font-bold leading-relaxed text-[#667085]"
            data-testid="needs-native-check-note"
          >
            {t('ai.needsNativeCheckNote')}
          </p>
          {notice ? <p className="mt-2 text-center text-sm font-black text-[var(--brand-red)]">{notice}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

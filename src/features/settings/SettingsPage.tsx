import { ShieldCheck, Sparkles } from 'lucide-react';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/PrimaryButton';

type SettingsPageProps = {
  onNavigate: (path: string) => void;
};

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  return (
    <div>
      <Header
        title="設定"
        subtitle="Taiwan Talk の前提と使い方"
        onMenu={() => onNavigate('/')}
      />

      <section className="space-y-3">
        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="text-[var(--brand-blue)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">このアプリについて</h2>
          </div>
          <p className="text-sm font-bold leading-relaxed text-[#344054]">
            Taiwan Talk は、台湾華語と日本語の自然な会話を助ける、非公式の会話サポートアプリです。
            完璧な翻訳保証ではなく、気持ちを伝えるきっかけを作るための補助です。
          </p>
        </article>

        <article className="glass-card rounded-[20px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles aria-hidden="true" className="text-[var(--brand-red)]" size={20} />
            <h2 className="text-base font-black text-[#141821]">保存データと今後</h2>
          </div>
          <p className="text-sm font-bold leading-relaxed text-[#344054]">
            初回実装では、保存したフレーズはこの端末のブラウザ内に置かれます。
            将来はAI生成、音声認識、Supabase連携へ差し替えられる構造にしています。
          </p>
        </article>

        <article className="rounded-[18px] border border-[#d9e1ee] bg-[#f9fbff] p-4">
          <p className="text-sm font-bold leading-relaxed text-[#667085]">
            現在は開発中のため、AI生成と発音チェック結果は仮の表示です。
            音声再生と録音はブラウザ機能を使った土台実装です。
            台湾華語の表現は、今後ネイティブ確認を入れて調整予定です。
          </p>
        </article>
      </section>

      <PrimaryButton className="mt-5" fullWidth variant="blue" onClick={() => onNavigate('/')}>
        使うへ戻る
      </PrimaryButton>
    </div>
  );
}

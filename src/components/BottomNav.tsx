import { Folder, Home, MessageCircle, Mic2, Pencil } from 'lucide-react';
import { useDisplayLanguage } from '../lib/displayLanguage/DisplayLanguageProvider';
import type { TranslationKey } from '../lib/displayLanguage/types';

export type NavKey = '/' | '/compose' | '/messages' | '/practice' | '/saved';

type BottomNavProps = {
  activePath: string;
  onNavigate: (path: NavKey) => void;
};

const navItems: Array<{
  path: NavKey;
  labelKey: TranslationKey;
  icon: typeof Home;
}> = [
  { path: '/', labelKey: 'nav.home', icon: Home },
  { path: '/compose', labelKey: 'nav.compose', icon: Pencil },
  { path: '/messages', labelKey: 'nav.messages', icon: MessageCircle },
  { path: '/practice', labelKey: 'nav.practice', icon: Mic2 },
  { path: '/saved', labelKey: 'nav.saved', icon: Folder },
];

export function BottomNav({ activePath, onNavigate }: BottomNavProps) {
  const { t } = useDisplayLanguage();

  return (
    <nav aria-label="主要画面" className="bottom-nav">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.path === activePath;
          const label = t(item.labelKey);

          return (
            <button
              key={item.path}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] text-[11px] font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
                active ? 'text-[var(--brand-red)]' : 'text-[#141821] active:bg-[#f3f6fb]',
              ].join(' ')}
              title={label}
              type="button"
              onClick={() => onNavigate(item.path)}
            >
              <Icon
                aria-hidden="true"
                size={24}
                strokeWidth={active ? 2.8 : 2.2}
                fill={active && item.path === '/' ? 'currentColor' : 'none'}
              />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

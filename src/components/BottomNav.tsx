import { Folder, Home, MessageCircle, Mic2, Pencil } from 'lucide-react';

export type NavKey = '/' | '/compose' | '/messages' | '/practice' | '/saved';

type BottomNavProps = {
  activePath: string;
  onNavigate: (path: NavKey) => void;
};

const navItems: Array<{
  path: NavKey;
  label: string;
  icon: typeof Home;
}> = [
  { path: '/', label: '使う', icon: Home },
  { path: '/compose', label: '作る', icon: Pencil },
  { path: '/messages', label: 'メッセージ', icon: MessageCircle },
  { path: '/practice', label: '練習', icon: Mic2 },
  { path: '/saved', label: '保存', icon: Folder },
];

export function BottomNav({ activePath, onNavigate }: BottomNavProps) {
  return (
    <nav aria-label="主要画面" className="bottom-nav">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.path === activePath;

          return (
            <button
              key={item.path}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] text-[11px] font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
                active ? 'text-[var(--brand-red)]' : 'text-[#141821] active:bg-[#f3f6fb]',
              ].join(' ')}
              title={item.label}
              type="button"
              onClick={() => onNavigate(item.path)}
            >
              <Icon
                aria-hidden="true"
                size={24}
                strokeWidth={active ? 2.8 : 2.2}
                fill={active && item.path === '/' ? 'currentColor' : 'none'}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

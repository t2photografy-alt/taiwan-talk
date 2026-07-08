import type { ReactNode } from 'react';
import { Clock3, Menu } from 'lucide-react';

type HeaderProps = {
  title: string;
  subtitle: string;
  rightIcon?: ReactNode;
  onMenu?: () => void;
  onRight?: () => void;
};

export function Header({ title, subtitle, rightIcon, onMenu, onRight }: HeaderProps) {
  return (
    <header className="mb-4 grid grid-cols-[44px_1fr_44px] items-center gap-2">
      <button
        aria-label="設定を開く"
        className="grid h-11 w-11 place-items-center rounded-full text-[#141821] transition active:bg-[#f3f6fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        title="設定"
        type="button"
        onClick={onMenu}
      >
        <Menu aria-hidden="true" size={24} strokeWidth={2.3} />
      </button>
      <div className="min-w-0 text-center">
        <h1 className="text-[22px] font-black leading-tight tracking-normal text-[#141821]">{title}</h1>
        <p className="mt-0.5 truncate text-xs font-bold text-[#344054]">{subtitle}</p>
      </div>
      <button
        aria-label="補助メニュー"
        className="grid h-11 w-11 place-items-center rounded-full text-[#141821] transition active:bg-[#f3f6fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        title="補助メニュー"
        type="button"
        onClick={onRight}
      >
        {rightIcon ?? <Clock3 aria-hidden="true" size={23} strokeWidth={2.3} />}
      </button>
    </header>
  );
}

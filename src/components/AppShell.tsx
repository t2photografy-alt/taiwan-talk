import type { ReactNode } from 'react';
import { BrandHeader } from './BrandHeader';
import { BottomNav, type NavKey } from './BottomNav';

type AppShellProps = {
  children: ReactNode;
  activePath: string;
  hideNav?: boolean;
  onNavigate: (path: NavKey | string) => void;
};

export function AppShell({ children, activePath, hideNav = false, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className={`app-content ${hideNav ? 'display-mode' : ''}`}>
        {!hideNav ? <BrandHeader /> : null}
        {children}
      </div>
      {!hideNav ? <BottomNav activePath={activePath} onNavigate={onNavigate} /> : null}
    </div>
  );
}

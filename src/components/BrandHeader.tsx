import { DarumaLogo } from './DarumaLogo';

type BrandHeaderProps = {
  className?: string;
};

export function BrandHeader({ className = '' }: BrandHeaderProps) {
  return (
    <header className={`mb-5 flex items-start gap-3 ${className}`}>
      <DarumaLogo className="h-[58px] w-[58px]" size="md" />
      <div className="min-w-0 pt-0.5">
        <p className="text-[34px] font-black leading-none tracking-normal">
          <span className="text-[var(--brand-red)]">Taiwan</span>{' '}
          <span className="text-[var(--brand-blue)]">Talk</span>
        </p>
        <p className="mt-2 text-[13px] font-bold leading-tight text-[#141821]">
          日本と台湾の友達を、もっと近くに。
        </p>
      </div>
    </header>
  );
}

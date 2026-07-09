import { DarumaLogo } from './DarumaLogo';
import { displayLanguageOptions, useDisplayLanguage } from '../lib/displayLanguage/DisplayLanguageProvider';

type BrandHeaderProps = {
  className?: string;
};

export function BrandHeader({ className = '' }: BrandHeaderProps) {
  const { language, setLanguage, t } = useDisplayLanguage();

  return (
    <header className={`mb-5 flex items-start gap-3 ${className}`}>
      <DarumaLogo className="h-[58px] w-[58px]" size="md" />
      <div className="min-w-0 pt-0.5">
        <p className="text-[34px] font-black leading-none tracking-normal">
          <span className="text-[var(--brand-red)]">Taiwan</span>{' '}
          <span className="text-[var(--brand-blue)]">Talk</span>
        </p>
        <p className="mt-2 text-[13px] font-bold leading-tight text-[#141821]">
          {t('brand.subtitle')}
        </p>
        <div className="mt-3 inline-flex max-w-full items-center gap-1 rounded-full border border-[#d9e1ee] bg-white p-1 shadow-[0_8px_20px_rgba(18,35,64,0.05)]">
          <span className="px-2 text-[10px] font-black text-[#667085]">{t('language.label')}</span>
          {displayLanguageOptions.map((item) => (
            <button
              key={item.language}
              className={[
                'min-h-8 rounded-full px-3 text-xs font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
                language === item.language
                  ? 'bg-[var(--brand-blue)] text-white'
                  : 'text-[#344054] active:bg-[#f3f6fb]',
              ].join(' ')}
              type="button"
              onClick={() => setLanguage(item.language)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

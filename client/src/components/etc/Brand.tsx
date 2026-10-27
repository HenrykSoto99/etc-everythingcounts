import { useI18n } from '../../contexts/I18nContext';

export default function Brand({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  const { t } = useI18n();
  return (
    <span className={`etc-brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <span>ETC</span>
        <i />
      </span>
      {!compact && (
        <span className="brand-name">
          EveryThingCounts<span>{t('CONVERSACIONES QUE CUENTAN')}</span>
        </span>
      )}
    </span>
  );
}

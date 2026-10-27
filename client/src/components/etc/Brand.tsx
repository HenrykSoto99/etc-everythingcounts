export default function Brand({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <span className={`etc-brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <span>ETC</span>
        <i />
      </span>
      {!compact && (
        <span className="brand-name">
          EveryThingCounts<span>CONVERSACIONES QUE CUENTAN</span>
        </span>
      )}
    </span>
  );
}

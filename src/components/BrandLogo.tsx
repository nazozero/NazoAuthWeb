import { publicAsset } from '../lib/publicAsset';

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-logo">
      <img
        src={publicAsset('icons/android-chrome-192x192.png')}
        width="36"
        height="36"
        alt=""
      />
      {!compact && <span>NazoAuth</span>}
    </span>
  );
}

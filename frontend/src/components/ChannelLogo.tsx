import { useEffect, useState } from 'react';
import { fallbackLogoUrl, resolveChannelVisual } from '../utils/channelLogos';

interface ChannelLogoProps {
  name: string;
  logo?: string;
  channelId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
}

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-16 w-16',
};

export function ChannelLogo({ name, logo, channelId, size = 'md', active }: ChannelLogoProps) {
  const visual = resolveChannelVisual(name, logo, channelId);
  const [src, setSrc] = useState<string | null>(visual.logoUrl);
  const [loading, setLoading] = useState(Boolean(visual.logoUrl));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(visual.logoUrl);
    setLoading(Boolean(visual.logoUrl));
    setFailed(false);
  }, [visual.logoUrl, channelId, name]);

  const showImg = src && !failed;

  const handleError = () => {
    const alt = src ? fallbackLogoUrl(src) : null;
    if (alt && alt !== src) {
      setSrc(alt);
      return;
    }
    setFailed(true);
    setLoading(false);
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10 ${SIZES[size]} ${
        active ? 'ring-2 ring-electric ring-offset-1 ring-offset-stadium' : ''
      }`}
      style={{
        background: showImg ? '#ffffff' : `${visual.accent}18`,
      }}
    >
      {loading && showImg && (
        <div className="absolute inset-0 animate-pulse bg-white/20" />
      )}
      {showImg ? (
        <img
          src={src}
          alt=""
          className="relative z-10 h-[78%] w-[78%] object-contain"
          onLoad={() => setLoading(false)}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          className="font-display text-[10px] font-bold leading-none sm:text-[11px]"
          style={{ color: visual.accent }}
        >
          {visual.initials}
        </span>
      )}
    </div>
  );
}

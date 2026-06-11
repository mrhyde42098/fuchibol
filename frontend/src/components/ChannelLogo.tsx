import { useState } from 'react';
import { resolveChannelVisual } from '../utils/channelLogos';

interface ChannelLogoProps {
  name: string;
  logo?: string;
  channelId?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

const SIZES = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function ChannelLogo({ name, logo, channelId, size = 'md', active }: ChannelLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const visual = resolveChannelVisual(name, logo, channelId);
  const showImg = visual.logoUrl && !imgFailed;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${SIZES[size]} ${
        active ? 'ring-2 ring-electric ring-offset-1 ring-offset-stadium' : ''
      }`}
      style={{
        background: showImg
          ? visual.darkBg
            ? '#0a0a12'
            : '#ffffff'
          : `${visual.accent}18`,
      }}
    >
      {showImg ? (
        <img
          src={visual.logoUrl!}
          alt=""
          className="h-[82%] w-[82%] object-contain"
          onError={() => setImgFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="font-display text-[10px] font-bold leading-none"
          style={{ color: visual.accent }}
        >
          {visual.initials}
        </span>
      )}
    </div>
  );
}

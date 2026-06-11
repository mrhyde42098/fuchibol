import { useState } from 'react';
import { resolveChannelVisual } from '../utils/channelLogos';

interface ChannelLogoProps {
  name: string;
  logo?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

const SIZES = {
  sm: 'h-7 w-7 text-[9px]',
  md: 'h-9 w-9 text-[10px]',
  lg: 'h-11 w-11 text-xs',
};

export function ChannelLogo({ name, logo, size = 'md', active }: ChannelLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const visual = resolveChannelVisual(name, logo);
  const showImg = visual.logoUrl && !imgFailed;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZES[size]} ${
        active ? 'ring-2 ring-electric ring-offset-1 ring-offset-stadium' : ''
      }`}
      style={{ background: showImg ? '#fff' : `${visual.accent}22` }}
    >
      {showImg ? (
        <img
          src={visual.logoUrl!}
          alt=""
          className="h-[70%] w-[70%] object-contain"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className="font-display font-bold" style={{ color: visual.accent }}>
          {visual.initials}
        </span>
      )}
    </div>
  );
}

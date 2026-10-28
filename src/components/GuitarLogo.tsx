import React from 'react';

interface GuitarLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtext?: string;
  onClick?: () => void;
}

export const GuitarLogo: React.FC<GuitarLogoProps> = ({
  className = '',
  size = 36,
  showText = false,
  subtext = 'Desi & Global Beats',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`flex items-center gap-3 select-none transition-all ${
        onClick ? 'cursor-pointer active:scale-95 group' : ''
      } ${className}`}
      title={onClick ? 'Melodifi Music' : undefined}
    >
      {/* Stylized Guitar Emblem Icon */}
      <div
        className="relative rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg shadow-rose-500/25 flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <div className="w-full h-full rounded-[14px] bg-[#0d0f17] flex items-center justify-center overflow-hidden relative">
          {/* Subtle soundwave ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20" />

          {/* Precision Vector Guitar Icon */}
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4 relative z-10 drop-shadow-md transform -rotate-12 hover:rotate-0 transition-transform duration-300"
          >
            {/* Guitar Neck & Headstock */}
            <path
              d="M32 6L40 14M35 9L25 19M38 12L28 22"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Tuning Pegs */}
            <circle cx="33" cy="5" r="1.5" fill="#f59e0b" />
            <circle cx="41" cy="13" r="1.5" fill="#f59e0b" />
            <circle cx="37" cy="7" r="1.5" fill="#f59e0b" />

            {/* Frets along neck */}
            <line x1="31" y1="13" x2="33" y2="15" stroke="#fef08a" strokeWidth="1.5" />
            <line x1="28" y1="16" x2="30" y2="18" stroke="#fef08a" strokeWidth="1.5" />
            <line x1="25" y1="19" x2="27" y2="21" stroke="#fef08a" strokeWidth="1.5" />

            {/* Guitar Body Silhouette */}
            <path
              d="M26 21C28 23 29 26 27.5 29C26 32 28.5 35 27 38C25 42 19 44 14 42C9 40 7 34 9 29C10.5 25 8.5 22 11.5 19.5C14.5 17 19 19 22 18C23.5 17.5 25 19.5 26 21Z"
              fill="url(#guitarGradient)"
              stroke="#fda4af"
              strokeWidth="1.5"
            />

            {/* Sound Hole */}
            <circle cx="18" cy="30" r="4" fill="#090a0f" stroke="#fbbf24" strokeWidth="1.2" />

            {/* Bridge */}
            <rect
              x="13"
              y="37"
              width="10"
              height="2.5"
              rx="1.2"
              fill="#fb7185"
              stroke="#fbbf24"
              strokeWidth="0.8"
            />

            {/* Vibration soundwaves */}
            <path
              d="M33 26C35 28 35 32 33 34"
              stroke="#34d399"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="1 3"
            />
            <path
              d="M37 23C40 27 40 33 37 37"
              stroke="#a78bfa"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            <defs>
              <linearGradient id="guitarGradient" x1="10" y1="18" x2="28" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f43f5e" />
                <stop offset="0.5" stopColor="#e11d48" />
                <stop offset="1" stopColor="#881337" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="block">
          <span className="text-sm sm:text-lg font-extrabold tracking-tight text-white block leading-tight">
            Melodifi
          </span>
          <span className="hidden sm:block text-[11px] text-emerald-400/90 font-medium tracking-wide">
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
};

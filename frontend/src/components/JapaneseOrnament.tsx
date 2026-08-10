import React from 'react';

type OrnamentType = 'sakura' | 'knot' | 'wave' | 'asanoha';

interface JapaneseOrnamentProps {
  type?: OrnamentType;
  className?: string;
}

export default function JapaneseOrnament({ type = 'sakura', className = '' }: JapaneseOrnamentProps) {
  // Sakura SVG
  const sakura = (
    <svg viewBox="0 0 100 100" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M50 20 C60 0, 90 20, 80 40 C100 50, 90 80, 70 70 C70 90, 30 90, 30 70 C10 80, 0 50, 20 40 C10 20, 40 0, 50 20 Z" />
      <circle cx="50" cy="45" r="8" className="fill-white opacity-40" />
    </svg>
  );

  // Traditional Knot SVG
  const knot = (
    <svg viewBox="0 0 100 100" className={`fill-none stroke-current stroke-[6] ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10 L80 40 L50 70 L20 40 Z" />
      <path d="M50 30 L70 50 L50 70" strokeLinecap="round" />
      <circle cx="50" cy="40" r="10" />
      <line x1="50" y1="70" x2="50" y2="90" strokeLinecap="round" />
      <line x1="40" y1="80" x2="60" y2="80" strokeLinecap="round" />
    </svg>
  );

  const wave = (
    <svg viewBox="0 0 100 100" className={`fill-none stroke-current stroke-[8] stroke-linecap-round ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 50 Q 25 20, 50 50 T 90 50" />
      <path d="M10 70 Q 25 40, 50 70 T 90 70" />
      <path d="M30 30 Q 40 10, 60 30 T 80 30" opacity="0.5"/>
    </svg>
  );

  const asanoha = (
    <svg viewBox="0 0 100 100" className={`fill-none stroke-current stroke-[4] ${className}`} xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" />
      <line x1="10" y1="30" x2="90" y2="70" />
      <line x1="10" y1="70" x2="90" y2="30" />
      <line x1="50" y1="10" x2="50" y2="90" />
      <polygon points="50,10 70,50 50,90 30,50" opacity="0.3" fill="currentColor" className="stroke-none" />
    </svg>
  );

  const getOrnament = () => {
    switch (type) {
      case 'sakura': return sakura;
      case 'knot': return knot;
      case 'wave': return wave;
      case 'asanoha': return asanoha;
      default: return sakura;
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {getOrnament()}
    </div>
  );
}

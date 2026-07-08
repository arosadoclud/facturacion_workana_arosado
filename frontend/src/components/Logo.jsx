import React from 'react';

/**
 * Logo "A" — Andy Rosado Soluciones Digitales
 * Fondo navy con la letra A en cian eléctrico, en un cuadrado redondeado.
 */
export function LogoMark({ size = 40, radius = 10, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-label="Andy Rosado"
    >
      <rect x="0" y="0" width="64" height="64" rx={radius} fill="#0A1426" />
      {/* Letra A estilo geométrico con corte diagonal */}
      <path
        d="M 32 10 L 51 54 L 42 54 L 38.5 45 L 25.5 45 L 22 54 L 13 54 L 32 10 Z M 32 24 L 28 36 L 36 36 L 32 24 Z"
        fill="#00E5FF"
      />
      {/* Corte diagonal decorativo */}
      <path
        d="M 42 42 L 51 54 L 42 54 Z"
        fill="#0A1426"
      />
    </svg>
  );
}

export function LogoHorizontal({ className = '', mark = 32, showTagline = true }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark size={mark} radius={mark * 0.22} />
      <div className="flex flex-col leading-none">
        <span className="font-display font-bold tracking-tight text-white text-base">
          ANDY <span className="text-cyan">ROSADO</span>
        </span>
        {showTagline && (
          <span className="text-[9px] uppercase tracking-[0.18em] text-cyan mt-1">
            Soluciones Digitales
          </span>
        )}
      </div>
    </div>
  );
}

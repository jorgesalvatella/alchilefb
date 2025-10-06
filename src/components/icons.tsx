import type { SVGProps } from 'react';

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" {...props}>
      <g>
        <path fill="currentColor" className="text-primary" d="M128 0C94.27 0 64.61 14.1 48 32c-11.41 12.3-24.36 32.3-32 48-11.72 24.3-16 48-16 64h32c0-35.35 17.91-64 32-64s32 28.65 32 64h32c0-35.35-17.91-64-32-64-8.84 0-16.84 5.34-24 12 .9-25.1 11.23-48.4 24-60 17.32-15.7 40.52-28 64-28V0z"/>
        <path fill="currentColor" className="text-accent" d="M112 16c-17.67 0-32 14.33-32 32s14.33 32 32 32 32-14.33 32-32-14.33-32-32-32zm0 48c-8.82 0-16-7.18-16-16s7.18-16 16-16 16 7.18 16 16-7.18 16-16 16z"/>
      </g>
    </svg>
  ),
};

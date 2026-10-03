/**
 * React wrappers for the prototype artwork. The markup is generated locally
 * from constants (no user input), so injecting it is safe.
 */
import { memo } from 'react';
import { heroSVG, officerSVG, potholeSVG, streetCamSVG } from './legacy.ts';
import { cn } from '@/lib/utils.ts';

const Raw = memo(function Raw({ html, className }: { html: string; className?: string }) {
  return <div className={cn('[&>svg]:block [&>svg]:h-full [&>svg]:w-full', className)} dangerouslySetInnerHTML={{ __html: html }} />;
});

export const HeroArt2D = ({ className, slice }: { className?: string; slice?: boolean }) => <Raw className={className} html={heroSVG(slice ? 'xMidYMid slice' : undefined)} />;
export const PotholeArt = ({ className }: { className?: string }) => <Raw className={className} html={potholeSVG()} />;
export const StreetCamArt = ({ className }: { className?: string }) => <Raw className={className} html={streetCamSVG()} />;
export const OfficerArt = ({ className, slice }: { className?: string; slice?: boolean }) => (
  <Raw className={className} html={slice ? officerSVG().replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ') : officerSVG()} />
);

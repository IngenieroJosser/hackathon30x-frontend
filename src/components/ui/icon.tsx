import type { ReactNode, SVGProps } from 'react';

type IconName = 'grid' | 'file' | 'users' | 'shield' | 'audit' | 'chart' | 'chevron' | 'arrow' | 'arrowUp' | 'arrowDown' | 'plus' | 'search' | 'bell' | 'help' | 'settings' | 'check' | 'cross' | 'clock' | 'alert' | 'sparkles' | 'play' | 'download' | 'filter' | 'more' | 'calendar' | 'external' | 'logout' | 'wallet' | 'globe' | 'menu' | 'close' | 'info' | 'refresh' | 'bolt' | 'lock' | 'receipt' | 'eye' | 'copy' | 'panel';
type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };
const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  shield: <><path d="m12 22 1.5-.7C19 18.8 21 15.9 21 10V5l-9-3-9 3v5c0 5.9 2 8.8 7.5 11.3L12 22Z"/><path d="m9 12 2 2 4-4"/></>,
  audit: <><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M8 9h7M8 13h4M8 17h4"/><path d="m16 5 2 2 4-4"/></>,
  chart: <><path d="M3 3v18h18M7 15l4-4 4 3 5-7"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>, arrow: <path d="M5 12h14m-7-7 7 7-7 7"/>,
  arrowUp: <path d="M7 17 17 7M9 7h8v8"/>,arrowDown:<path d="M12 5v14m-7-7 7 7 7-7"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1v2M12 17h.01"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12m0-14.14-2.12 2.12m-9.9 9.9-2.12 2.12"/></>,
  check:<path d="m5 12 4 4L19 6"/>, cross:<path d="M18 6 6 18M6 6l12 12"/>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  alert:<><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4m0 4h.01"/></>,
  sparkles:<><path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3ZM20 18l.8 1.2L22 20l-1.2.8L20 22l-.8-1.2L18 20l1.2-.8L20 18Z"/></>,
  play:<path d="m8 5 11 7-11 7V5Z"/>,
  download:<><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
  filter:<><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1" fill="currentColor"/></>,
  more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  external:<><path d="M14 3h7v7M21 3l-9 9M20 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7"/></>,
  logout:<><path d="M10 17l5-5-5-5m5 5H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></>,
  wallet:<><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M17 14h.01"/></>,
  globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
  menu:<path d="M4 6h16M4 12h16M4 18h16"/>,close:<path d="M18 6 6 18M6 6l12 12"/>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 5M4 12l1 5a8 8 0 0 0 14-2"/></>,
  bolt:<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>,
  lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  receipt:<><path d="M4 3h16v18l-4-2-4 2-4-2-4 2V3Z"/><path d="M8 8h8M8 12h8"/></>,
  eye:<><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  copy:<><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  panel:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></>,
};
export function Icon({ name, size = 20, strokeWidth = 1.8, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

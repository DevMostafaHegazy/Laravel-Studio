import * as React from 'react';

export type IconName =
    | 'arrow-right'
    | 'chevron-down'
    | 'chevron-right'
    | 'check'
    | 'check-circle'
    | 'alert-circle'
    | 'x-circle'
    | 'info'
    | 'folder'
    | 'folder-open'
    | 'plus'
    | 'play'
    | 'flask'
    | 'terminal'
    | 'database'
    | 'container'
    | 'route'
    | 'bug'
    | 'refresh'
    | 'search'
    | 'command'
    | 'code'
    | 'file'
    | 'settings'
    | 'git-branch'
    | 'external'
    | 'copy'
    | 'clock'
    | 'cpu'
    | 'globe'
    | 'trash'
    | 'table'
    | 'layers'
    | 'hash'
    | 'spark'
    | 'close';

const paths: Record<IconName, React.ReactNode> = {
    'arrow-right': <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></>,
    'x-circle': <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6" /><path d="m15 9-6 6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
    folder: <path d="M3.5 6.5h6l2 2H20a1.5 1.5 0 0 1 1.5 1.5v8A2.5 2.5 0 0 1 19 20.5H5A2.5 2.5 0 0 1 2.5 18V8.5A2 2 0 0 1 3.5 6.5Z" />,
    'folder-open': <><path d="M3 8.5V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1" /><path d="M3.2 10.5h18l-2.3 8.1a2 2 0 0 1-1.9 1.4H5.3a2 2 0 0 1-1.9-1.4L2.2 13a2 2 0 0 1 1-2.5Z" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    play: <path d="M8 5.2v13.6L19 12 8 5.2Z" />,
    flask: <><path d="M9 3h6" /><path d="M10 3v5.4L4.5 18a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 8.4V3" /><path d="M7 14h10" /></>,
    terminal: <><path d="m4 17 6-6-6-6" /><path d="M12 19h8" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    container: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5" /><path d="M12 12v9" /></>,
    route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
    bug: <><rect x="7" y="7" width="10" height="12" rx="4" /><path d="M9 7V5.5A3.5 3.5 0 0 1 12.5 2 3.5 3.5 0 0 1 16 5.5V7" /><path d="M3 12h4M17 12h4M4 18l4-2M20 18l-4-2M4 6l4 2M20 6l-4 2" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.4 9A7.5 7.5 0 0 0 5.6 6.4L4 8" /><path d="M5.6 15A7.5 7.5 0 0 0 18.4 17.6L20 16" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></>,
    command: <><path d="M9 8V6a3 3 0 1 1 3 3H6a3 3 0 1 0 3 3v6a3 3 0 1 0 3-3h6a3 3 0 1 0-3-3V6" /></>,
    code: <><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    'git-branch': <><circle cx="6" cy="5" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="19" r="2.5" /><path d="M6 7.5v9" /><path d="M18 8.5c0 5.2-5.5 3.1-9.4 5.4" /></>,
    external: <><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    cpu: <><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></>,
    trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    hash: <><path d="M4 9h16M3 15h16" /><path d="m10 3-2 18M16 3l-2 18" /></>,
    spark: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>
};

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
    filled?: boolean;
}

export function Icon({ name, size = 18, className, filled }: IconProps): React.ReactElement {
    return (
        <svg
            aria-hidden="true"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className ? `ls-icon ${className}` : 'ls-icon'}
        >
            {paths[name]}
        </svg>
    );
}

export function BrandMark({ size = 36 }: { size?: number }): React.ReactElement {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="62" height="62" rx="17" fill="url(#ls-brand-bg)" stroke="rgba(255,255,255,.09)" />
            <path d="M22 16v32h25" stroke="url(#ls-brand-stroke)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="47" cy="21" r="4.2" fill="#69A2FF" />
            <defs>
                <linearGradient id="ls-brand-bg" x1="10" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#232F45" />
                    <stop offset="1" stopColor="#11141A" />
                </linearGradient>
                <linearGradient id="ls-brand-stroke" x1="22" y1="16" x2="47" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F7F9FF" />
                    <stop offset="1" stopColor="#C8D7F4" />
                </linearGradient>
            </defs>
        </svg>
    );
}

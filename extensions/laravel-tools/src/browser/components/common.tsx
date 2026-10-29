import * as React from 'react';
import { Icon, type IconName } from './icons';

export function Spinner({ size = 14, label }: { size?: number; label?: string }): React.ReactElement {
    return (
        <span
            className='ls-spinner'
            role={label ? 'status' : undefined}
            aria-label={label}
            style={{ width: size, height: size }}
        />
    );
}

export function Badge({
    children,
    tone = 'neutral',
    title
}: {
    children: React.ReactNode;
    tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
    title?: string;
}): React.ReactElement {
    return <span className={`ls-badge ls-badge--${tone}`} title={title}>{children}</span>;
}

export function StatusDot({ status = 'info' }: { status?: 'ok' | 'warning' | 'error' | 'info' | 'idle' }): React.ReactElement {
    return <span className={`ls-status-dot ls-status-dot--${status}`} aria-hidden="true" />;
}

export function IconButton({
    icon,
    label,
    onClick,
    disabled,
    className
}: {
    icon: IconName;
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
}): React.ReactElement {
    return (
        <button
            type='button'
            className={`ls-icon-button ${className ?? ''}`}
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
        >
            <Icon name={icon} size={16} />
        </button>
    );
}

export function Button({
    children,
    icon,
    variant = 'secondary',
    onClick,
    disabled,
    loading,
    className,
    title
}: {
    children: React.ReactNode;
    icon?: IconName;
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    title?: string;
}): React.ReactElement {
    return (
        <button
            type='button'
            className={`ls-button ls-button--${variant} ${className ?? ''}`}
            onClick={onClick}
            disabled={disabled || loading}
            title={title}
        >
            {loading ? <Spinner /> : icon ? <Icon name={icon} size={16} /> : null}
            <span>{children}</span>
        </button>
    );
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }): React.ReactElement {
    const [copied, setCopied] = React.useState(false);
    const copy = async (event: React.MouseEvent): Promise<void> => {
        event.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1_500);
        } catch {
            // Clipboard access can be unavailable depending on the sandbox.
        }
    };
    return (
        <button type='button' className='ls-copy-button' onClick={copy} title={copied ? 'Copied' : label} aria-label={copied ? 'Copied' : label}>
            <Icon name={copied ? 'check' : 'copy'} size={14} />
        </button>
    );
}

export function EmptyState({
    icon,
    title,
    children,
    action
}: {
    icon: IconName;
    title: string;
    children?: React.ReactNode;
    action?: React.ReactNode;
}): React.ReactElement {
    return (
        <div className='ls-empty'>
            <div className='ls-empty__icon'><Icon name={icon} size={22} /></div>
            <h3>{title}</h3>
            {children ? <p>{children}</p> : null}
            {action ? <div className='ls-empty__action'>{action}</div> : null}
        </div>
    );
}

export function SkeletonLines({ count = 3 }: { count?: number }): React.ReactElement {
    return (
        <div className='ls-skeleton' aria-hidden='true'>
            {Array.from({ length: count }, (_, index) => (
                <span key={index} style={{ width: `${[88, 66, 74, 54][index % 4]}%` }} />
            ))}
        </div>
    );
}

export function ErrorBanner({ children, action }: { children: React.ReactNode; action?: React.ReactNode }): React.ReactElement {
    return (
        <div className='ls-error-banner' role='alert'>
            <Icon name='alert-circle' size={17} />
            <span>{children}</span>
            {action ? <div className='ls-error-banner__action'>{action}</div> : null}
        </div>
    );
}

export function SectionHeader({
    eyebrow,
    title,
    description,
    actions
}: {
    eyebrow?: string;
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}): React.ReactElement {
    return (
        <header className='ls-section-header'>
            <div>
                {eyebrow ? <span className='ls-eyebrow'>{eyebrow}</span> : null}
                <h2>{title}</h2>
                {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className='ls-section-header__actions'>{actions}</div> : null}
        </header>
    );
}

export function ToolStatus({
    label,
    available,
    version,
    detail
}: {
    label: string;
    available: boolean;
    version?: string;
    detail?: string;
}): React.ReactElement {
    return (
        <div className='ls-tool-status' title={detail}>
            <StatusDot status={available ? 'ok' : 'error'} />
            <span className='ls-tool-status__label'>{label}</span>
            <span className='ls-tool-status__version'>{version ?? (available ? 'Ready' : 'Missing')}</span>
        </div>
    );
}

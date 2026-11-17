import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'danger' | 'warning' | 'success';
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === 'info' ? Info : tone === 'success' ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-sm',
        tone === 'info' && 'border-brand-soft-2 bg-brand-soft text-brand-strong',
        tone === 'warning' && 'border-attention-line bg-attention-soft text-attention-fg',
        tone === 'danger' && 'border-danger/20 bg-danger-soft text-danger',
        tone === 'success' && 'border-success/20 bg-success-soft text-success',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

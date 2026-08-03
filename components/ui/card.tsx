import { cn } from '@/lib/utils';

export function Card({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={cn('rounded-[20px] border border-white/10 bg-[#0F1629] shadow-soft', className)} style={style}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>;
}

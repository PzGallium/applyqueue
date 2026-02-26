import { createContext, useContext, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export function Collapsible({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div className="w-full">{children}</div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('w-full justify-between', className)}
      onClick={() => ctx.setOpen(!ctx.open)}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 transition-transform', ctx.open && 'rotate-180')} />
    </Button>
  );
}

export function CollapsibleContent({ children, className }: { children: ReactNode; className?: string }) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) return null;
  if (!ctx.open) return null;
  return <div className={cn(className)}>{children}</div>;
}

'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: Menu.DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[14rem] rounded-[var(--radius-control)] border border-line bg-white p-1 shadow-lg shadow-fg/10',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: Menu.DropdownMenuItemProps) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-fg-secondary outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle data-[highlighted]:text-fg [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: Menu.DropdownMenuLabelProps) {
  return <Menu.Label className={cn('px-2.5 py-2 text-xs text-fg-muted', className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-line" />;
}

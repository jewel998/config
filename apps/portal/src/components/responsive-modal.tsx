import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

const DragHandle = ({ onDismiss }: { onDismiss: () => void }) => {
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0]?.clientY ?? 0;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = currentY.current - startY.current;
    if (diff > 80) {
      onDismiss();
    }
  }, [onDismiss]);

  return (
    <div
      className="flex cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
    </div>
  );
};

export const ResponsiveModal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-5">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-6"
        showCloseButton={false}
      >
        <DragHandle onDismiss={() => onOpenChange(false)} />
        <SheetHeader className="px-0">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-4 space-y-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
};

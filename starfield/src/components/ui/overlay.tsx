"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import { Drawer as VaulDrawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-card border border-white/10 shadow-2xl overflow-y-auto",
            "inset-x-0 bottom-0 max-h-[92vh] rounded-t-[18px] p-4",
            "sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[480px] sm:max-h-none sm:rounded-[18px] sm:p-6",
          )}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="关闭">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  danger,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Alert.Root open={open} onOpenChange={onOpenChange}>
      <Alert.Portal>
        <Alert.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Alert.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-white/10 bg-card p-5">
          <Alert.Title className="text-base font-semibold">{title}</Alert.Title>
          <Alert.Description className="mt-2 text-sm text-muted">{description}</Alert.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Alert.Cancel asChild>
              <Button variant="secondary">取消</Button>
            </Alert.Cancel>
            <Alert.Action asChild>
              <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
                {confirmText}
              </Button>
            </Alert.Action>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}

export function BottomDrawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <VaulDrawer.Root open={open} onOpenChange={onOpenChange}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] rounded-t-[18px] bg-card border-t border-white/10 p-4 safe-bottom">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <VaulDrawer.Title className="text-base font-semibold mb-3">{title}</VaulDrawer.Title>
          <div className="overflow-y-auto">{children}</div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}

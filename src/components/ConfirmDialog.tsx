"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, HelpCircle, Info } from "lucide-react"

type ConfirmVariant = "danger" | "warning" | "info"

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider")
  return ctx.confirm
}

const variantConfig: Record<ConfirmVariant, {
  icon: ReactNode
  iconBg: string
  confirmClass: string
}> = {
  danger: {
    icon: <Trash2 className="h-5 w-5 text-red-500" />,
    iconBg: "bg-red-500/10 ring-1 ring-red-500/20",
    confirmClass: "bg-red-600 text-white hover:bg-red-700 shadow-red-500/20 shadow-lg",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    iconBg: "bg-amber-500/10 ring-1 ring-amber-500/20",
    confirmClass: "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-500/20 shadow-lg",
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-500" />,
    iconBg: "bg-blue-500/10 ring-1 ring-blue-500/20",
    confirmClass: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 shadow-lg",
  },
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((res) => {
      setOptions(opts)
      setResolve(() => res)
      setOpen(true)
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    setOpen(false)
    resolve?.(result)
    // Delay cleanup so the closing animation can finish
    setTimeout(() => {
      setOptions(null)
      setResolve(null)
    }, 200)
  }, [resolve])

  const variant = options?.variant ?? "danger"
  const config = variantConfig[variant]

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(false) }}>
        <DialogContent className="max-w-[420px] rounded-2xl border border-border/50 shadow-2xl bg-card p-0 gap-0" showCloseButton={false}>
          <div className="p-6 pb-4">
            <DialogHeader className="flex-row items-start gap-4 space-y-0">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${config.iconBg}`}>
                {config.icon}
              </div>
              <div className="space-y-1.5 pt-0.5">
                <DialogTitle className="text-base font-semibold leading-tight">
                  {options?.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {options?.description}
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>
          <DialogFooter className="bg-muted/30 border-t border-border/50 px-6 py-4 flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="rounded-xl border-border/50 hover:bg-muted/50 transition-colors flex-1 sm:flex-none"
            >
              {options?.cancelText ?? "Cancel"}
            </Button>
            <Button
              onClick={() => handleClose(true)}
              className={`rounded-xl transition-all flex-1 sm:flex-none ${config.confirmClass}`}
            >
              {options?.confirmText ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

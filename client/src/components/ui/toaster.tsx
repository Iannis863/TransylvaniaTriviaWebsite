import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider label={t("Notificare")}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{typeof title === "string" ? t(title) : title}</ToastTitle>}
              {description && (
                <ToastDescription>{typeof description === "string" ? t(description) : description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport label={t("Notificări ({hotkey})")} />
    </ToastProvider>
  )
}

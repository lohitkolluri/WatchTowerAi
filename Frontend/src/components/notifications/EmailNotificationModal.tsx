import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailNotificationForm } from "./EmailNotificationForm";

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
}

export function EmailNotificationModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: EmailNotificationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {initialData ? "Edit Email Notification" : "Configure Email Notification"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-8 py-6">
          <EmailNotificationForm
            onSubmit={onSubmit}
            onCancel={onClose}
            initialData={initialData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

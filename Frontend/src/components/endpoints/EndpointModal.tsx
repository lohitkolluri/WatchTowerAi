import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EndpointForm from "./EndpointForm";

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
}

export function EndpointModal({ isOpen, onClose, onSubmit, initialData }: EndpointModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Endpoint' : 'Add New Endpoint'}</DialogTitle>
        </DialogHeader>
        <EndpointForm
          onSubmit={onSubmit}
          onCancel={onClose}
          initialData={initialData as { id?: string; name: string; url: string; method: string; service?: string; environment?: string; description?: string } | undefined}
        />
      </DialogContent>
    </Dialog>
  );
}

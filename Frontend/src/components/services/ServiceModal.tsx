import { useState } from "react";
import { X } from "lucide-react";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ServiceFormData) => Promise<void>;
  initialData?: Partial<ServiceFormData>;
}

export interface ServiceFormData {
  name: string;
  environment: string;
  alertRules: string;
  notificationChannels: string[];
}

export function ServiceModal({ isOpen, onClose, onSubmit, initialData }: ServiceModalProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: initialData?.name || "",
    environment: initialData?.environment || "Production",
    alertRules: initialData?.alertRules || "",
    notificationChannels: initialData?.notificationChannels || ["Slack"],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (channel: string) => {
    setFormData((prev) => {
      const currentChannels = prev.notificationChannels || [];
      if (currentChannels.includes(channel)) {
        return {
          ...prev,
          notificationChannels: currentChannels.filter((c) => c !== channel),
        };
      } else {
        return {
          ...prev,
          notificationChannels: [...currentChannels, channel],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.name.trim()) {
      setError("Service name is required");
      return;
    }

    if (!formData.environment) {
      setError("Environment is required");
      return;
    }

    if (!formData.alertRules.trim()) {
      setError("At least one alert rule is required");
      return;
    }

    if (!formData.notificationChannels.length) {
      setError("At least one notification channel is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while saving the service");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            {initialData ? "Edit Service" : "Register New Service"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Auth Service, Payment API"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="environment" className="text-sm font-medium">
              Environment <span className="text-red-500">*</span>
            </label>
            <select
              id="environment"
              name="environment"
              value={formData.environment}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="alertRules" className="text-sm font-medium">
              Alert Rules <span className="text-red-500">*</span>
            </label>
            <input
              id="alertRules"
              name="alertRules"
              value={formData.alertRules}
              onChange={handleChange}
              placeholder="e.g., Error rate > 1%, CPU usage > 80%"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Notification Channels <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="slack"
                  checked={formData.notificationChannels.includes("Slack")}
                  onChange={() => handleCheckboxChange("Slack")}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="slack" className="text-sm">
                  Slack
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="email"
                  checked={formData.notificationChannels.includes("Email")}
                  onChange={() => handleCheckboxChange("Email")}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="email" className="text-sm">
                  Email
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sms"
                  checked={formData.notificationChannels.includes("SMS")}
                  onChange={() => handleCheckboxChange("SMS")}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="sms" className="text-sm">
                  SMS
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : initialData ? "Update Service" : "Register Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

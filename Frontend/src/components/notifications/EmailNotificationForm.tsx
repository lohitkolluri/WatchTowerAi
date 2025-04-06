import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmailNotificationFormProps {
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  initialData?: Record<string, any>;
}

export function EmailNotificationForm({
  onSubmit,
  onCancel,
  initialData,
}: EmailNotificationFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    recipients: initialData?.recipients || "",
    frequency: initialData?.frequency || "realtime",
    threshold: initialData?.threshold || "",
    conditions: initialData?.conditions || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="Notification Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="h-10"
        />
        <Input
          placeholder="Recipients (comma-separated)"
          value={formData.recipients}
          onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          value={formData.frequency}
          onValueChange={(value) => setFormData({ ...formData, frequency: value })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Notification Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realtime">Real-time</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Alert Threshold"
          type="number"
          value={formData.threshold}
          onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
          className="h-10"
        />
      </div>

      <Input
        placeholder="Alert Conditions (e.g., error rate > 5%)"
        value={formData.conditions}
        onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
        className="h-10 w-full"
      />

      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10"
        >
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          {initialData ? "Update" : "Create"} Notification
        </Button>
      </div>
    </form>
  );
}

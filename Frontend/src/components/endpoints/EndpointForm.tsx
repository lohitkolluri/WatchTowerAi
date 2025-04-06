import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnvironments, normalizeEnvironment, addCustomEnvironment } from "@/lib/environments";

interface EndpointFormProps {
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    id?: string;
    name: string;
    url: string;
    method: string;
    service?: string;
    environment?: string;
    description?: string;
  };
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const ENVIRONMENTS = ["Development", "Staging", "Production"];

export default function EndpointForm({ onSubmit, onCancel, initialData }: EndpointFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    url: initialData?.url || "",
    method: initialData?.method || "GET",
    service: initialData?.service || "",
    environment: initialData?.environment || "Development",
    description: initialData?.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Input
          placeholder="Endpoint Name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="h-11"
        />
        <Select
          value={formData.method}
          onValueChange={(value) => handleChange("method", value)}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="HTTP Method" />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input
        placeholder="URL (e.g., /api/users)"
        value={formData.url}
        onChange={(e) => handleChange("url", e.target.value)}
        className="h-11"
      />

      <div className="grid grid-cols-2 gap-6">
        <Input
          placeholder="Service Name"
          value={formData.service}
          onChange={(e) => handleChange("service", e.target.value)}
          className="h-11"
        />
        <Select
          value={formData.environment}
          onValueChange={(value) => handleChange("environment", value)}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            {ENVIRONMENTS.map((env) => (
              <SelectItem key={env} value={env}>
                {env}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => handleChange("description", e.target.value)}
        className="h-24 align-top py-2"
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Update Endpoint" : "Add Endpoint"}
        </Button>
      </div>
    </form>
  );
}

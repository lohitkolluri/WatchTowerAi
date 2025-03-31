import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnvironments, normalizeEnvironment, addCustomEnvironment } from "@/lib/environments";

interface EndpointFormProps {
  initialData?: {
    id?: string;
    name: string;
    url: string;
    method: string;
    service?: string;
    environment?: string;
    description?: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export default function EndpointForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false
}: EndpointFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    service: '',
    environment: 'production',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use our environment hook instead of managing custom environments directly
  const { allEnvironments, addEnvironment } = useEnvironments();

  // Initialize form data when initial data is provided
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        method: initialData.method || 'GET',
        service: initialData.service || '',
        environment: normalizeEnvironment(initialData.environment),
        description: initialData.description || ''
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user changes input
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Validate URL
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch (e) {
        newErrors.url = 'Please enter a valid URL (include http:// or https://)';
      }
    }

    // Validate service
    if (!formData.service.trim()) {
      newErrors.service = 'Service is required';
    }

    // Validate environment
    if (!formData.environment) {
      newErrors.environment = 'Environment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the data in the format expected by the backend
      const data = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        method: formData.method,
        service: formData.service.trim(),
        environment: normalizeEnvironment(formData.environment),
        description: formData.description.trim() || undefined
      };

      console.log('Submitting endpoint with data:', data);
      await onSubmit(data);

      // Add environment if it's new
      if (formData.environment) {
        addEnvironment(formData.environment);
      }

      if (!isEditing) {
        // Reset form if not editing
        setFormData({
          name: '',
          url: '',
          method: 'GET',
          service: '',
          environment: 'production',
          description: ''
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setErrors({ form: 'Failed to save endpoint. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {errors.form}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full rounded-lg border ${errors.name ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            placeholder="My API Endpoint"
            required
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="service" className="text-sm font-medium">
            Service <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="service"
            name="service"
            value={formData.service}
            onChange={handleInputChange}
            className={`w-full rounded-lg border ${errors.service ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            placeholder="auth-service"
            required
          />
          {errors.service && <p className="text-sm text-destructive">{errors.service}</p>}
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="environment">Environment</Label>
          <Select
            name="environment"
            value={formData.environment}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, environment: value }))
            }
          >
            <SelectTrigger id="environment">
              <SelectValue placeholder="Select an environment" />
            </SelectTrigger>
            <SelectContent>
              {allEnvironments.map((env) => (
                <SelectItem key={env.value} value={env.value}>
                  {env.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="method" className="text-sm font-medium">
            Method <span className="text-destructive">*</span>
          </label>
          <select
            id="method"
            name="method"
            value={formData.method}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="url" className="text-sm font-medium">
          URL <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="url"
          name="url"
          value={formData.url}
          onChange={handleInputChange}
          className={`w-full rounded-lg border ${errors.url ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
          placeholder="https://api.example.com/endpoint"
          required
        />
        {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm h-24"
          placeholder="What does this endpoint do?"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Endpoint' : 'Add Endpoint'}
        </button>
      </div>
    </form>
  );
}

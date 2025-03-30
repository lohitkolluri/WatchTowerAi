import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [customEnvironments, setCustomEnvironments] = useState<string[]>([]);

  // Define standard environments with proper capitalization
  const standardEnvironments = [
    { value: 'production', label: 'Production' },
    { value: 'staging', label: 'Staging' },
    { value: 'development', label: 'Development' },
    { value: 'testing', label: 'Testing' },
    { value: 'qa', label: 'QA' }
  ];

  // Standard environment values for comparison
  const standardEnvValues = standardEnvironments.map(env => env.value);

  // Load custom environments
  useEffect(() => {
    const saved = localStorage.getItem('customEnvironments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomEnvironments(parsed);
        }
      } catch (e) {
        console.error('Error loading custom environments:', e);
      }
    }
  }, []);

  // Set up initial data
  useEffect(() => {
    if (initialData) {
      const environment = initialData.environment?.toLowerCase() || 'production';

      // Check if this environment is already in our standard environments or custom environments
      const isStandardEnv = standardEnvValues.includes(environment);
      const isInCustomEnvs = customEnvironments.includes(environment);

      // Only add to custom environments if it's a new environment
      if (environment && !isStandardEnv && !isInCustomEnvs) {
        setCustomEnvironments(prev => [...prev, environment]);
      }

      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        method: initialData.method || 'GET',
        service: initialData.service || '',
        environment: environment,
        description: initialData.description || ''
      });
    }
  }, [initialData, customEnvironments]);

  // Combine standard and custom environments for the select dropdown
  const environments = [
    ...standardEnvironments,
    ...customEnvironments.filter(env => !standardEnvValues.includes(env)).map(env => ({
      value: env,
      label: env.charAt(0).toUpperCase() + env.slice(1) // Capitalize first letter
    }))
  ];

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
        environment: formData.environment.toLowerCase(),
        description: formData.description.trim() || undefined
      };

      console.log('Submitting endpoint with data:', data);
      await onSubmit(data);

      if (formData.environment && !environments.some(env => env.value === formData.environment)) {
        const newEnvironment = formData.environment.toLowerCase();
        const updatedEnvironments = [...customEnvironments, newEnvironment];
        setCustomEnvironments(updatedEnvironments);
        localStorage.setItem('customEnvironments', JSON.stringify(updatedEnvironments));
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
              {environments.map((env) => (
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

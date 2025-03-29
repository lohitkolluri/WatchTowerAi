import { useEffect, useState } from 'react';

interface EndpointFormProps {
  initialData?: {
    id?: string;
    name: string;
    url: string;
    method: string;
    service?: string;
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
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        method: initialData.method || 'GET',
        service: initialData.service || '',
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
        service: formData.service.trim() || undefined,
        description: formData.description.trim() || undefined
      };

      await onSubmit(data);
      if (!isEditing) {
        // Reset form if not editing
        setFormData({
          name: '',
          url: '',
          method: 'GET',
          service: '',
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
    <form onSubmit={handleSubmit} className="space-y-4 p-6 border rounded-md bg-card">
      <h2 className="text-xl font-semibold">{isEditing ? 'Edit Endpoint' : 'Add New Endpoint'}</h2>

      {errors.form && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errors.form}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name:
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-input'} bg-background p-2 text-sm`}
          required
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="url" className="text-sm font-medium">
          URL:
        </label>
        <input
          type="text"
          id="url"
          name="url"
          value={formData.url}
          placeholder="https://api.example.com/endpoint"
          onChange={handleInputChange}
          className={`w-full rounded-md border ${errors.url ? 'border-red-500' : 'border-input'} bg-background p-2 text-sm`}
          required
        />
        {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="method" className="text-sm font-medium">
          Method:
        </label>
        <select
          id="method"
          name="method"
          value={formData.method}
          onChange={handleInputChange}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="service" className="text-sm font-medium">
          Service: <span className="text-muted-foreground text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="service"
          name="service"
          value={formData.service}
          placeholder="e.g., payment-api, auth-service"
          onChange={handleInputChange}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description: <span className="text-muted-foreground text-xs">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          placeholder="What does this endpoint do?"
          onChange={handleInputChange}
          className="w-full rounded-md border border-input bg-background p-2 text-sm h-24"
        ></textarea>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Endpoint' : 'Add Endpoint'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

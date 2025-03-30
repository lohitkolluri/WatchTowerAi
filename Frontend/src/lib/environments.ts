import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Centralized environment configuration for the application
 * Standardizes environment naming, storage, and retrieval across components
 */

// Standard environment definitions
export const StandardEnvironments = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' },
  { value: 'testing', label: 'Testing' },
  { value: 'qa', label: 'QA' }
];

// Default environment to use when none is specified
export const DEFAULT_ENVIRONMENT = 'production';

// Get values array from standard environments for easier comparison
export const StandardEnvironmentValues = StandardEnvironments.map(env => env.value);

/**
 * Get proper label for environment value
 * @param value Environment value (lowercase)
 * @returns Properly formatted environment label
 */
export function getEnvironmentLabel(value: string): string {
  const standardEnv = StandardEnvironments.find(env => env.value === value.toLowerCase());
  if (standardEnv) {
    return standardEnv.label;
  }
  // Capitalize first letter for custom environments
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Load custom environments from localStorage
 * @returns Array of custom environment values
 */
export function loadCustomEnvironments(): string[] {
  try {
    const saved = localStorage.getItem('customEnvironments');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom environments:', e);
  }
  return [];
}

/**
 * Save custom environments to localStorage
 * @param environments Array of custom environment values to save
 */
export function saveCustomEnvironments(environments: string[]): void {
  try {
    localStorage.setItem('customEnvironments', JSON.stringify(environments));
  } catch (e) {
    console.error('Error saving custom environments:', e);
  }
}

/**
 * Add a new custom environment
 * @param environment Environment value to add
 * @param currentEnvironments Current list of custom environments
 * @returns Updated list of custom environments
 */
export function addCustomEnvironment(environment: string, currentEnvironments: string[]): string[] {
  const normalizedEnv = environment.trim().toLowerCase();

  // Don't add if it's a standard environment
  if (StandardEnvironmentValues.includes(normalizedEnv)) {
    return currentEnvironments;
  }

  // Don't add if it already exists
  if (currentEnvironments.includes(normalizedEnv)) {
    return currentEnvironments;
  }

  // Add and save
  const updatedEnvironments = [...currentEnvironments, normalizedEnv];
  saveCustomEnvironments(updatedEnvironments);
  return updatedEnvironments;
}

/**
 * Remove a custom environment
 * @param environment Environment value to remove
 * @param currentEnvironments Current list of custom environments
 * @returns Updated list of custom environments
 */
export function removeCustomEnvironment(environment: string, currentEnvironments: string[]): string[] {
  const normalizedEnv = environment.trim().toLowerCase();

  // Don't remove standard environments
  if (StandardEnvironmentValues.includes(normalizedEnv)) {
    return currentEnvironments;
  }

  // Remove and save
  const updatedEnvironments = currentEnvironments.filter(env => env !== normalizedEnv);
  saveCustomEnvironments(updatedEnvironments);
  return updatedEnvironments;
}

/**
 * Get all available environments (standard + custom + provided)
 * @param additionalEnvironments Optional additional environments to include
 * @returns Complete list of available environments with proper formatting
 */
export function getAllEnvironments(additionalEnvironments: string[] = []): Array<{value: string, label: string}> {
  // Start with standard environments
  const result = [...StandardEnvironments];

  // Add custom environments
  const customEnvironments = loadCustomEnvironments();
  customEnvironments.forEach(env => {
    result.push({
      value: env,
      label: getEnvironmentLabel(env)
    });
  });

  // Add additional environments
  additionalEnvironments.forEach(env => {
    const normalizedEnv = env.trim().toLowerCase();
    // Only add if not already in the list
    if (!result.some(e => e.value === normalizedEnv)) {
      result.push({
        value: normalizedEnv,
        label: getEnvironmentLabel(normalizedEnv)
      });
    }
  });

  // Sort by label
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get environment value in lowercase format
 * @param environment Environment string which might be in mixed case
 * @returns Normalized environment string
 */
export function normalizeEnvironment(environment: string | undefined): string {
  if (!environment) {
    return DEFAULT_ENVIRONMENT;
  }
  return environment.trim().toLowerCase();
}

/**
 * Hook to manage environments in components
 * Provides standard environments, custom environments, and functions to manage them
 */
export function useEnvironments(additionalEnvironments: string[] = []) {
  const [customEnvironments, setCustomEnvironments] = useState<string[]>([]);

  // Load custom environments on mount
  useEffect(() => {
    setCustomEnvironments(loadCustomEnvironments());
  }, []);

  // Get all environments (standard + custom + additional)
  const allEnvironments = useMemo(() => {
    return getAllEnvironments(additionalEnvironments);
  }, [customEnvironments, additionalEnvironments]);

  // Function to add a new environment
  const addEnvironment = useCallback((environment: string): void => {
    const updated = addCustomEnvironment(environment, customEnvironments);
    setCustomEnvironments(updated);
  }, [customEnvironments]);

  // Function to remove an environment
  const removeEnvironment = useCallback((environment: string): void => {
    const updated = removeCustomEnvironment(environment, customEnvironments);
    setCustomEnvironments(updated);
  }, [customEnvironments]);

  return {
    standardEnvironments: StandardEnvironments,
    customEnvironments,
    allEnvironments,
    addEnvironment,
    removeEnvironment
  };
}

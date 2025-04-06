import { api } from "@/lib/api";

interface SMTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  use_tls: boolean;
}

interface DatabaseConfig {
  url: string;
  name: string;
}

// Default configuration values
const DEFAULT_SMTP_CONFIG: SMTPConfig = {
  host: "",
  port: "",
  username: "",
  password: "",
  from_email: "",
  use_tls: true
};

const DEFAULT_DB_CONFIG: DatabaseConfig = {
  url: "",
  name: ""
};

export const settingsService = {
  // Load environment variables if present
  loadEnvSettings: () => {
    const settings = {
      smtp: {
        host: process.env.NEXT_PUBLIC_SMTP_HOST || "",
        port: process.env.NEXT_PUBLIC_SMTP_PORT || "",
        username: process.env.NEXT_PUBLIC_SMTP_USERNAME || "",
        password: process.env.NEXT_PUBLIC_SMTP_PASSWORD || "",
        from_email: process.env.NEXT_PUBLIC_SMTP_FROM_EMAIL || "",
        use_tls: process.env.NEXT_PUBLIC_SMTP_USE_TLS !== "false"
      },
      database: {
        url: process.env.NEXT_PUBLIC_DATABASE_URL || "",
        name: process.env.NEXT_PUBLIC_DATABASE_NAME || ""
      }
    };

    return settings;
  },

  // SMTP settings
  getSMTPConfig: async (): Promise<SMTPConfig> => {
    try {
      // Try to get settings from API first
      const apiSettings = await api.settings.getSMTP();

      // Ensure we have valid values, even if the API returns unexpected format
      return {
        host: apiSettings?.host || DEFAULT_SMTP_CONFIG.host,
        port: apiSettings?.port || DEFAULT_SMTP_CONFIG.port,
        username: apiSettings?.username || DEFAULT_SMTP_CONFIG.username,
        password: apiSettings?.password || DEFAULT_SMTP_CONFIG.password,
        from_email: apiSettings?.from_email || DEFAULT_SMTP_CONFIG.from_email,
        use_tls: typeof apiSettings?.use_tls === 'boolean' ? apiSettings.use_tls : DEFAULT_SMTP_CONFIG.use_tls
      };
    } catch (error) {
      console.error("Failed to fetch SMTP settings from API:", error);
      // Fall back to environment variables
      const envSettings = settingsService.loadEnvSettings();
      return {
        ...DEFAULT_SMTP_CONFIG,
        ...envSettings.smtp
      };
    }
  },

  updateSMTPConfig: async (config: SMTPConfig): Promise<void> => {
    try {
    await api.settings.updateSMTP(config);
    } catch (error) {
      console.error("Failed to update SMTP settings:", error);
      throw error;
    }
  },

  // Database settings
  getDatabaseConfig: async (): Promise<DatabaseConfig> => {
    try {
    // For now, just return environment variables
    const envSettings = settingsService.loadEnvSettings();
      return {
        ...DEFAULT_DB_CONFIG,
        ...envSettings.database
      };
    } catch (error) {
      console.error("Failed to fetch database settings:", error);
      return DEFAULT_DB_CONFIG;
    }
  },

  updateDatabaseConfig: async (config: DatabaseConfig): Promise<void> => {
    // Implement database config update when API endpoint is available
    throw new Error("Database config update not implemented yet");
  }
};

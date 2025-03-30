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
      return apiSettings;
    } catch (error) {
      console.error("Failed to fetch SMTP settings from API:", error);
      // Fall back to environment variables
      const envSettings = settingsService.loadEnvSettings();
      return envSettings.smtp;
    }
  },

  updateSMTPConfig: async (config: SMTPConfig): Promise<void> => {
    await api.settings.updateSMTP(config);
  },

  // Database settings
  getDatabaseConfig: async (): Promise<DatabaseConfig> => {
    // For now, just return environment variables
    const envSettings = settingsService.loadEnvSettings();
    return envSettings.database;
  },

  updateDatabaseConfig: async (config: DatabaseConfig): Promise<void> => {
    // Implement database config update when API endpoint is available
    throw new Error("Database config update not implemented yet");
  }
};

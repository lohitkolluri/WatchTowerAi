import { api } from "@/lib/api";
import { SMTPConfig, SMTPConfigResponse } from "@/types/smtp";

interface DatabaseConfig {
  url: string;
  name: string;
}

// Default configuration values
const DEFAULT_SMTP_CONFIG: SMTPConfig = {
  host: "",
  port: 587,
  username: "",
  password: "",
  from_email: "",
  use_tls: true
};

const DEFAULT_DB_CONFIG: DatabaseConfig = {
  url: "",
  name: ""
};

// Helper function to convert backend SMTP config to frontend format
function convertSMTPConfig(backendConfig: SMTPConfigResponse): SMTPConfig {
  return {
    host: backendConfig.SMTP_SERVER,
    port: backendConfig.SMTP_PORT,
    username: backendConfig.SMTP_USERNAME,
    password: backendConfig.SMTP_PASSWORD,
    from_email: backendConfig.EMAIL_FROM,
    use_tls: true // Default to true for security
  };
}

export const settingsService = {
  // Load environment variables if present
  loadEnvSettings: () => {
    const settings = {
      smtp: {
        host: process.env.NEXT_PUBLIC_SMTP_HOST || "",
        port: parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || "587"),
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

  // Get SMTP configuration from the backend
  getSMTP: async (): Promise<SMTPConfig> => {
    try {
      const response = await api.settings.getSMTP();
      return convertSMTPConfig(response);
    } catch (error) {
      console.error("Failed to load SMTP configuration:", error);
      return DEFAULT_SMTP_CONFIG;
    }
  },

  // Update SMTP configuration
  updateSMTP: async (config: SMTPConfig): Promise<void> => {
    try {
      await api.settings.updateSMTP({
        SMTP_SERVER: config.host,
        SMTP_PORT: config.port,
        SMTP_USERNAME: config.username,
        SMTP_PASSWORD: config.password,
        EMAIL_FROM: config.from_email,
        ALERT_RECIPIENT: config.from_email // Using from_email as recipient for now
      });
    } catch (error) {
      console.error("Failed to update SMTP configuration:", error);
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

"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services/settingsService";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function SettingsPage() {
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: "",
    port: "",
    username: "",
    password: "",
    from_email: "",
    use_tls: true
  });

  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    url: "",
    name: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load SMTP settings
        const smtpSettings = await settingsService.getSMTPConfig();
        setSmtpConfig(smtpSettings);

        // Load database settings
        const dbSettings = await settingsService.getDatabaseConfig();
        setDbConfig(dbSettings);
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Failed to load settings");
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSMTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsService.updateSMTPConfig(smtpConfig);
      toast.success("SMTP settings updated successfully");
    } catch (error) {
      toast.error("Failed to update SMTP settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDatabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsService.updateDatabaseConfig(dbConfig);
      toast.success("Database settings updated successfully");
    } catch (error) {
      toast.error("Failed to update database settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const envSettings = settingsService.loadEnvSettings();
  const hasEnvSMTPSettings = Object.values(envSettings.smtp).some(value => value !== "");
  const hasEnvDBSettings = Object.values(envSettings.database).some(value => value !== "");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Error Loading Settings
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                {hasEnvSMTPSettings
                  ? "SMTP settings are configured via environment variables. You can override them below."
                  : "Configure your SMTP settings for email notifications."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSMTPSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="host">SMTP Host</Label>
                    <Input
                      id="host"
                      placeholder="smtp.example.com"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    />
                    {envSettings.smtp.host && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.host}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">SMTP Port</Label>
                    <Input
                      id="port"
                      placeholder="587"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                    />
                    {envSettings.smtp.port && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.port}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="username@example.com"
                      value={smtpConfig.username}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                    />
                    {envSettings.smtp.username && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.username}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                    />
                    {envSettings.smtp.password && (
                      <p className="text-xs text-muted-foreground">Password is set in environment variables</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from_email">From Email</Label>
                    <Input
                      id="from_email"
                      placeholder="notifications@example.com"
                      value={smtpConfig.from_email}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                    />
                    {envSettings.smtp.from_email && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.from_email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="use_tls" className="block mb-2">Use TLS</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use_tls"
                        checked={smtpConfig.use_tls}
                        onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, use_tls: checked })}
                      />
                      <Label htmlFor="use_tls">Enable TLS encryption</Label>
                    </div>
                    {envSettings.smtp.use_tls && (
                      <p className="text-xs text-muted-foreground">TLS is {envSettings.smtp.use_tls ? "enabled" : "disabled"} in environment variables</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSmtpConfig({
                      host: "",
                      port: "",
                      username: "",
                      password: "",
                      from_email: "",
                      use_tls: true
                    })}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Settings
              </CardTitle>
              <CardDescription>
                {hasEnvDBSettings
                  ? "Database settings are configured via environment variables. You can override them below."
                  : "Configure your database connection settings."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDatabaseSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Database URL</Label>
                    <Input
                      placeholder="mongodb://localhost:27017"
                      value={dbConfig.url}
                      onChange={(e) => setDbConfig({ ...dbConfig, url: e.target.value })}
                    />
                    {envSettings.database.url && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.database.url}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Database Name</Label>
                    <Input
                      placeholder="watchtower"
                      value={dbConfig.name}
                      onChange={(e) => setDbConfig({ ...dbConfig, name: e.target.value })}
                    />
                    {envSettings.database.name && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.database.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDbConfig({
                      url: "",
                      name: ""
                    })}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

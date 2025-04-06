"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { settingsService } from "@/services/settingsService";
import { Mail, AlertTriangle } from "lucide-react";

// Interfaces
interface SMTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  use_tls: boolean;
}

export default function SettingsPage() {
  // Basic form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [useTls, setUseTls] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envSettings, setEnvSettings] = useState({
    smtp: {
      host: "",
      port: "",
      username: "",
      password: "",
      from_email: "",
      use_tls: true
    }
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);

      // Load environment variables
      const envVars = settingsService.loadEnvSettings();
      setEnvSettings(envVars);

      try {
        // Load system settings
        const smtpSettings = await settingsService.getSMTPConfig();

        // Set individual form fields
        setHost(smtpSettings?.host || "");
        setPort(smtpSettings?.port || "");
        setUsername(smtpSettings?.username || "");
        setPassword(smtpSettings?.password || "");
        setFromEmail(smtpSettings?.from_email || "");
        setUseTls(smtpSettings?.use_tls !== undefined ? smtpSettings.use_tls : true);
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

  // Handle form submissions
  const handleSMTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Collect all form field values into a config object
    const smtpConfig = {
      host,
      port,
      username,
      password,
      from_email: fromEmail,
      use_tls: useTls
    };

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
        </div>
      </MainLayout>
    );
  }

  const hasEnvSMTPSettings = Object.values(envSettings.smtp).some(value => value !== "");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">
              Configure system settings for your WatchTowerAI instance
            </p>
          </div>
        </div>

        {error && (
          <Card className="border-destructive mb-6">
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
          {/* SMTP Configuration */}
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
                    <input
                      id="host"
                      type="text"
                      placeholder="smtp.example.com"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm"
                    />
                    {envSettings.smtp.host && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.host}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">SMTP Port</Label>
                    <input
                      id="port"
                      type="text"
                      placeholder="587"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm"
                    />
                    {envSettings.smtp.port && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.port}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <input
                      id="username"
                      type="text"
                      placeholder="username@example.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm"
                    />
                    {envSettings.smtp.username && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.username}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm"
                    />
                    {envSettings.smtp.password && (
                      <p className="text-xs text-muted-foreground">Password is set in environment variables</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from_email">From Email</Label>
                    <input
                      id="from_email"
                      type="text"
                      placeholder="notifications@example.com"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm"
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
                        checked={useTls}
                        onCheckedChange={setUseTls}
                      />
                      <Label htmlFor="use_tls">Enable TLS encryption</Label>
                    </div>
                    {envSettings.smtp.use_tls.toString() && (
                      <p className="text-xs text-muted-foreground">Current value from environment: {envSettings.smtp.use_tls ? "Enabled" : "Disabled"}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="secondary" type="button" className="mr-2">
                    Test Connection
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save SMTP Settings"}
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

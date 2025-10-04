"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Github, Save, AlertCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface GitHubConfigProps {
  config: {
    token: string
    owner: string
    repo: string
    branch: string
  }
  onConfigChange: (config: any) => void
}

export function GitHubConfig({ config, onConfigChange }: GitHubConfigProps) {
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("git_sync_acc")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("[v0] Error loading config:", error)
        return
      }

      if (data) {
        onConfigChange({
          token: data.token,
          owner: data.owner,
          repo: data.repo,
          branch: data.branch,
        })
      }
    } catch (error) {
      console.error("[v0] Error loading config:", error)
    }
  }

  const updateConfig = (key: string, value: string) => {
    onConfigChange({ ...config, [key]: value })
  }

  const saveConfig = async () => {
    try {
      // Check if config exists
      const { data: existing } = await supabase.from("git_sync_acc").select("id").limit(1).single()

      if (existing) {
        // Update existing config
        const { error } = await supabase
          .from("git_sync_acc")
          .update({
            token: config.token,
            owner: config.owner,
            repo: config.repo,
            branch: config.branch,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        if (error) throw error
      } else {
        // Insert new config
        const { error } = await supabase.from("git_sync_acc").insert({
          token: config.token,
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
        })

        if (error) throw error
      }

      toast({
        title: "Configuration saved",
        description: "Your GitHub configuration has been saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error saving config:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          <CardTitle>GitHub Configuration</CardTitle>
        </div>
        <CardDescription>Configure your GitHub repository settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Token Permissions Required:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>
                <strong>Classic Token:</strong> Enable the{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> scope
              </li>
              <li>
                <strong>Fine-grained Token:</strong> Grant{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">Contents</code> read and write permissions
              </li>
            </ul>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline mt-2 inline-block"
            >
              Create or manage tokens →
            </a>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="token">Personal Access Token</Label>
          <Input
            id="token"
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={config.token}
            onChange={(e) => updateConfig("token", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner">Repository Owner</Label>
          <Input
            id="owner"
            placeholder="username"
            value={config.owner}
            onChange={(e) => updateConfig("owner", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repo">Repository Name</Label>
          <Input
            id="repo"
            placeholder="my-repo"
            value={config.repo}
            onChange={(e) => updateConfig("repo", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            placeholder="main"
            value={config.branch}
            onChange={(e) => updateConfig("branch", e.target.value)}
          />
        </div>
        <Button onClick={saveConfig} className="w-full gap-2">
          <Save className="h-4 w-4" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  )
}

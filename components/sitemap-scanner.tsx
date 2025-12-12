"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Scan, Loader2, CheckCircle2, XCircle, FileText, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface SitemapPage {
  url: string
  name: string
  folderPath: string | null
  folderName: string | null
  filePath: string
  fileExtension: string
}

interface ScanResult {
  page: SitemapPage
  status: "new" | "exists" | "added" | "error"
  message?: string
}

interface SitemapScannerProps {
  githubConfig: {
    token: string
    owner: string
    repo: string
    branch: string
  }
  onPagesAdded: () => void
}

export function SitemapScanner({ githubConfig, onPagesAdded }: SitemapScannerProps) {
  const [sitemapUrl, setSitemapUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadSitemapUrl()
  }, [])

  const loadSitemapUrl = async () => {
    try {
      const client = getSupabaseBrowserClient()
      if (!client) {
        console.error("[v0] Supabase client not initialized")
        return
      }

      const { data, error } = await client.from("git_sync_config").select("sitemap_url").single()

      if (error) {
        console.error("[v0] Error loading sitemap URL:", error)
        return
      }

      if (data?.sitemap_url) {
        setSitemapUrl(data.sitemap_url)
      }
    } catch (error) {
      console.error("[v0] Error loading sitemap URL:", error)
    }
  }

  const saveSitemapUrl = async () => {
    if (!sitemapUrl) {
      toast({
        title: "Missing sitemap URL",
        description: "Please provide a sitemap URL to save",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("git_sync_config")
        .update({ sitemap_url: sitemapUrl, updated_at: new Date().toISOString() })
        .eq("id", (await supabase.from("git_sync_config").select("id").single()).data?.id)

      if (error) throw error

      toast({
        title: "Sitemap URL saved",
        description: "Your sitemap URL has been saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error saving sitemap URL:", error)
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Failed to save sitemap URL",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const scanSitemap = async () => {
    if (!sitemapUrl) {
      toast({
        title: "Missing sitemap URL",
        description: "Please provide a sitemap URL to scan",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)
    setScanResults([])
    setShowResults(true)

    try {
      console.log("[v0] Parsing sitemap:", sitemapUrl)

      await supabase
        .from("git_sync_config")
        .update({ sitemap_url: sitemapUrl, updated_at: new Date().toISOString() })
        .eq("id", (await supabase.from("git_sync_config").select("id").single()).data?.id)

      const parseResponse = await fetch("/api/parse-sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl }),
      })

      console.log("[v0] Parse response status:", parseResponse.status)
      console.log("[v0] Parse response content-type:", parseResponse.headers.get("content-type"))

      const contentType = parseResponse.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await parseResponse.text()
        console.error("[v0] Non-JSON response received:", textResponse.substring(0, 200))
        throw new Error("Server returned non-JSON response. Check console for details.")
      }

      const parseData = await parseResponse.json()

      if (!parseResponse.ok) {
        throw new Error(parseData.error || "Failed to parse sitemap")
      }

      const { pages } = parseData
      console.log("[v0] Found pages:", pages.length)

      const { data: existingPages } = await supabase.from("git_sync_pages").select("url, name, folder_path")

      const treeResponse = await fetch("/api/github-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(githubConfig),
      })

      let existingRepoFiles: string[] = []
      if (treeResponse.ok) {
        const treeContentType = treeResponse.headers.get("content-type")
        if (treeContentType && treeContentType.includes("application/json")) {
          try {
            const { tree } = await treeResponse.json()
            existingRepoFiles = tree.filter((item: any) => item.type === "blob").map((item: any) => item.path)
            console.log("[v0] Found existing repo files:", existingRepoFiles.length)
          } catch (error) {
            console.error("[v0] Error parsing github-tree response:", error)
          }
        } else {
          console.warn("[v0] github-tree returned non-JSON response, skipping repo file check")
        }
      } else {
        console.warn("[v0] github-tree request failed with status:", treeResponse.status)
      }

      const results: ScanResult[] = []

      for (const page of pages) {
        const existsInDb = existingPages?.some((p) => p.url === page.url)

        if (existsInDb) {
          results.push({
            page,
            status: "exists",
            message: "Already in sync list",
          })
          continue
        }

        const fileExistsInRepo = existingRepoFiles.includes(page.filePath)

        try {
          const insertData: any = {
            url: page.url,
            name: page.name,
            folder_name: page.folderName,
            folder_path: page.folderPath,
          }

          if (fileExistsInRepo) {
            insertData.repo_file_path = page.filePath
          }

          const { error } = await supabase.from("git_sync_pages").insert(insertData)

          if (error) throw error

          results.push({
            page,
            status: "added",
            message: fileExistsInRepo ? "Linked to existing file" : "Will create new file on sync",
          })
        } catch (error) {
          console.error("[v0] Error adding page:", page.url, error)
          results.push({
            page,
            status: "error",
            message: error instanceof Error ? error.message : "Failed to add",
          })
        }
      }

      setScanResults(results)

      const addedCount = results.filter((r) => r.status === "added").length
      const existsCount = results.filter((r) => r.status === "exists").length

      toast({
        title: "Sitemap scan complete",
        description: `Added ${addedCount} new pages. ${existsCount} already existed.`,
      })

      if (addedCount > 0) {
        onPagesAdded()
      }
    } catch (error) {
      console.error("[v0] Error scanning sitemap:", error)
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Failed to scan sitemap",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusIcon = (status: ScanResult["status"]) => {
    switch (status) {
      case "added":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "exists":
        return <FileText className="h-4 w-4 text-blue-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: ScanResult["status"]) => {
    switch (status) {
      case "added":
        return <Badge className="bg-green-500">Added</Badge>
      case "exists":
        return <Badge variant="secondary">Exists</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sitemap Scanner</CardTitle>
        <CardDescription>Automatically scan and import pages from your website's sitemap</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/sitemap.xml"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            disabled={isScanning || isSaving}
          />
          <Button
            onClick={saveSitemapUrl}
            disabled={isScanning || isSaving || !sitemapUrl}
            variant="outline"
            size="icon"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button onClick={scanSitemap} disabled={isScanning || !sitemapUrl} className="gap-2 shrink-0">
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4" />
                Scan
              </>
            )}
          </Button>
        </div>

        {showResults && scanResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Scan Results ({scanResults.length})</h4>
              <div className="flex gap-2 text-xs">
                <span className="text-green-600">{scanResults.filter((r) => r.status === "added").length} added</span>
                <span className="text-blue-600">
                  {scanResults.filter((r) => r.status === "exists").length} existing
                </span>
                {scanResults.filter((r) => r.status === "error").length > 0 && (
                  <span className="text-red-600">{scanResults.filter((r) => r.status === "error").length} errors</span>
                )}
              </div>
            </div>
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-3">
                {scanResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{result.page.filePath}</code>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{result.page.url}</p>
                      {result.message && <p className="text-xs text-muted-foreground mt-0.5">{result.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

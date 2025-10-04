"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, RefreshCw, Link2 } from "lucide-react"
import { PageList } from "@/components/page-list"
import { FolderManager } from "@/components/folder-manager"
import { FilePicker } from "@/components/file-picker"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Page {
  id: string
  url: string
  name: string
  folderName: string | null
  folderPath: string | null
  lastSynced: Date | null
  repoFilePath: string | null
}

interface Folder {
  id: string
  name: string
  path: string
}

interface PageManagerProps {
  githubConfig: {
    token: string
    owner: string
    repo: string
    branch: string
  }
}

export function PageManager({ githubConfig }: PageManagerProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [newPageUrl, setNewPageUrl] = useState("")
  const [newPageName, setNewPageName] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [linkMode, setLinkMode] = useState<"new" | "existing">("new")
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [selectedRepoFile, setSelectedRepoFile] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = async () => {
    try {
      const { data, error } = await supabase.from("git_sync_pages").select("*").order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Error loading pages:", error)
        return
      }

      if (data) {
        const loadedPages: Page[] = data.map((page) => ({
          id: page.id,
          url: page.url,
          name: page.name,
          folderName: page.folder_name,
          folderPath: page.folder_path,
          lastSynced: page.last_synced ? new Date(page.last_synced) : null,
          repoFilePath: page.repo_file_path || null,
        }))
        setPages(loadedPages)

        const uniqueFolders = data
          .filter((page) => page.folder_name && page.folder_path)
          .reduce((acc, page) => {
            // Use folder_path as unique identifier
            if (!acc.find((f) => f.path === page.folder_path)) {
              acc.push({
                id: page.folder_path, // Use path as ID
                name: page.folder_name,
                path: page.folder_path,
              })
            }
            return acc
          }, [] as Folder[])
        setFolders(uniqueFolders)
      }
    } catch (error) {
      console.error("[v0] Error loading pages:", error)
    }
  }

  const addPage = async () => {
    if (!newPageUrl) {
      toast({
        title: "Missing information",
        description: "Please provide a URL for the page",
        variant: "destructive",
      })
      return
    }

    if (linkMode === "new" && !newPageName) {
      toast({
        title: "Missing information",
        description: "Please provide a name for the new file",
        variant: "destructive",
      })
      return
    }

    if (linkMode === "existing" && !selectedRepoFile) {
      toast({
        title: "Missing information",
        description: "Please select a file from the repository",
        variant: "destructive",
      })
      return
    }

    try {
      let repoFilePath: string
      let pageName: string
      let folderPath: string | null = null
      let folderName: string | null = null

      if (linkMode === "existing" && selectedRepoFile) {
        repoFilePath = selectedRepoFile
        const fileName = selectedRepoFile.split("/").pop() || ""
        pageName = fileName.replace(/\.html$/, "")
        const pathParts = selectedRepoFile.split("/")
        if (pathParts.length > 1) {
          folderPath = pathParts.slice(0, -1).join("/")
          folderName = pathParts[pathParts.length - 2]
        }
      } else {
        const folder = folders.find((f) => f.id === selectedFolder)
        pageName = newPageName
        folderPath = folder?.path || null
        folderName = folder?.name || null
        repoFilePath = folderPath ? `${folderPath}/${pageName}.html` : `${pageName}.html`
      }

      const insertData: any = {
        url: newPageUrl,
        name: pageName,
        folder_name: folderName,
        folder_path: folderPath,
      }

      // Only add repo_file_path if the column exists (after migration)
      const { data: testData } = await supabase.from("git_sync_pages").select("repo_file_path").limit(1)
      if (testData !== null) {
        insertData.repo_file_path = repoFilePath
      }

      const { data, error } = await supabase.from("git_sync_pages").insert(insertData).select().single()

      if (error) throw error

      const newPage: Page = {
        id: data.id,
        url: data.url,
        name: data.name,
        folderName: data.folder_name,
        folderPath: data.folder_path,
        lastSynced: null,
        repoFilePath: data.repo_file_path || repoFilePath,
      }

      setPages([...pages, newPage])
      setNewPageUrl("")
      setNewPageName("")
      setSelectedRepoFile(null)
      setLinkMode("new")

      toast({
        title: "Page added",
        description: `${pageName} has been added to your sync list`,
      })
    } catch (error) {
      console.error("[v0] Error adding page:", error)
      toast({
        title: "Failed to add page",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const removePage = async (id: string) => {
    try {
      const { error } = await supabase.from("git_sync_pages").delete().eq("id", id)

      if (error) throw error

      setPages(pages.filter((p) => p.id !== id))
      toast({
        title: "Page removed",
        description: "The page has been removed from your sync list",
      })
    } catch (error) {
      console.error("[v0] Error removing page:", error)
      toast({
        title: "Failed to remove page",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const syncAll = async () => {
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      toast({
        title: "Configuration incomplete",
        description: "Please complete your GitHub configuration first",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)

    try {
      for (const page of pages) {
        await syncPage(page)
      }

      toast({
        title: "Sync complete",
        description: `Successfully synced ${pages.length} page(s) to GitHub`,
      })
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "An error occurred during sync",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const syncPage = async (page: Page) => {
    const response = await fetch("/api/fetch-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: page.url }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${page.url}`)
    }

    const { content } = await response.json()

    const filePath =
      page.repoFilePath || (page.folderPath ? `${page.folderPath}/${page.name}.html` : `${page.name}.html`)

    const githubResponse = await fetch("/api/github-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...githubConfig,
        filePath,
        content,
        message: `Sync ${page.name} from ${page.url}`,
      }),
    })

    if (!githubResponse.ok) {
      throw new Error(`Failed to push ${page.name} to GitHub`)
    }

    const now = new Date()
    await supabase.from("git_sync_pages").update({ last_synced: now.toISOString() }).eq("id", page.id)

    setPages(pages.map((p) => (p.id === page.id ? { ...p, lastSynced: now } : p)))
  }

  const handleFoldersChange = async (newFolders: Folder[]) => {
    setFolders(newFolders)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Page</CardTitle>
          <CardDescription>Add a webpage to sync to your GitHub repository</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>File Mode</Label>
            <RadioGroup value={linkMode} onValueChange={(value) => setLinkMode(value as "new" | "existing")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="font-normal cursor-pointer">
                  Create new file
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal cursor-pointer">
                  Link to existing file in repository
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {linkMode === "new" && (
              <div className="space-y-2">
                <Input
                  placeholder="Page name (e.g., homepage)"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                />
              </div>
            )}

            {linkMode === "existing" && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilePicker(true)}
                  className="w-full justify-start gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  {selectedRepoFile || "Select file from repository"}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Input
                placeholder="https://example.com"
                value={newPageUrl}
                onChange={(e) => setNewPageUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {linkMode === "new" && (
              <FolderManager
                folders={folders}
                selectedFolder={selectedFolder}
                onFoldersChange={handleFoldersChange}
                onSelectFolder={setSelectedFolder}
              />
            )}
            <Button onClick={addPage} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Page
            </Button>
          </div>
        </CardContent>
      </Card>

      <FilePicker
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        onSelectFile={(filePath) => {
          setSelectedRepoFile(filePath)
          setShowFilePicker(false)
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pages ({pages.length})</CardTitle>
              <CardDescription>Manage your synced webpages</CardDescription>
            </div>
            <Button onClick={syncAll} disabled={pages.length === 0 || isSyncing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PageList pages={pages} folders={folders} onRemove={removePage} />
        </CardContent>
      </Card>
    </div>
  )
}

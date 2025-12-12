"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Folder, FileText, FolderOpen, RefreshCw, CheckCircle2 } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface TreeItem {
  path: string
  type: "blob" | "tree"
  size?: number
  sha: string
}

interface FolderStructure {
  [key: string]: {
    files: TreeItem[]
    subfolders: string[]
  }
}

export function RepositoryViewer() {
  const [tree, setTree] = useState<TreeItem[]>([])
  const [syncedPages, setSyncedPages] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]))
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    loadRepositoryTree()
    loadSyncedPages()
  }, [])

  const loadSyncedPages = async () => {
    try {
      const { data, error } = await supabase.from("git_sync_pages").select("folder_path, name")

      if (error) {
        console.error("[v0] Error loading synced pages:", error)
        return
      }

      if (data) {
        const synced = new Set(
          data.map((page) => {
            const folder = page.folder_path || ""
            return folder ? `${folder}/${page.name}.html` : `${page.name}.html`
          }),
        )
        setSyncedPages(synced)
      }
    } catch (error) {
      console.error("[v0] Error loading synced pages:", error)
    }
  }

  const loadRepositoryTree = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/github-tree")
      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Failed to load repository",
          description: data.error || "Could not fetch repository tree",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Loaded repository tree:", {
        totalItems: data.tree?.length || 0,
        truncated: data.truncated,
        types: data.tree?.reduce((acc: any, item: TreeItem) => {
          acc[item.type] = (acc[item.type] || 0) + 1
          return acc
        }, {}),
      })

      setTree(data.tree || [])

      if (data.truncated) {
        toast({
          title: "Repository tree truncated",
          description: "Your repository is very large. Some files may not be shown.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading repository tree:", error)
      toast({
        title: "Error",
        description: "Failed to load repository structure",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const buildFolderStructure = (): FolderStructure => {
    const structure: FolderStructure = {
      "": { files: [], subfolders: [] },
    }

    // First pass: create all folders from tree items
    tree.forEach((item) => {
      if (item.type === "tree") {
        // It's a directory - create it explicitly
        if (!structure[item.path]) {
          structure[item.path] = { files: [], subfolders: [] }
        }
      }
    })

    // Second pass: add files and infer any missing parent folders
    tree.forEach((item) => {
      if (item.type === "blob") {
        // It's a file
        const pathParts = item.path.split("/")
        const folderPath = pathParts.slice(0, -1).join("/")

        // Create folder if it doesn't exist (for files in folders not explicitly listed)
        if (!structure[folderPath]) {
          structure[folderPath] = { files: [], subfolders: [] }
        }
        structure[folderPath].files.push(item)
      }
    })

    // Third pass: build subfolder relationships
    Object.keys(structure).forEach((folderPath) => {
      if (folderPath === "") return

      const pathParts = folderPath.split("/")

      // Ensure all parent folders exist
      for (let i = 1; i <= pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i - 1).join("/")
        const currentPath = pathParts.slice(0, i).join("/")

        if (!structure[parentPath]) {
          structure[parentPath] = { files: [], subfolders: [] }
        }

        if (currentPath !== parentPath && !structure[parentPath].subfolders.includes(currentPath)) {
          structure[parentPath].subfolders.push(currentPath)
        }
      }
    })

    console.log("[v0] Built folder structure:", {
      totalFolders: Object.keys(structure).length,
      rootFiles: structure[""].files.length,
      rootSubfolders: structure[""].subfolders.length,
    })

    return structure
  }

  const renderFolder = (folderPath: string, structure: FolderStructure, depth = 0) => {
    const folder = structure[folderPath]
    if (!folder) return null

    const isExpanded = expandedFolders.has(folderPath)
    const folderName = folderPath ? folderPath.split("/").pop() : "Root"
    const isRoot = folderPath === ""

    return (
      <div key={folderPath} className="space-y-1">
        {!isRoot && (
          <button
            onClick={() => toggleFolder(folderPath)}
            className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 w-full text-left"
            style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{folderName}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {folder.files.length} files, {folder.subfolders.length} folders
            </span>
          </button>
        )}

        {(isRoot || isExpanded) && (
          <div className="space-y-1">
            {/* Render files in this folder */}
            {folder.files.map((file) => {
              const isSynced = syncedPages.has(file.path)
              return (
                <div
                  key={file.path}
                  className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50"
                  style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.75}rem` }}
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-mono flex-1">{file.path.split("/").pop()}</span>
                  {isSynced && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" title="Synced via app" />}
                  <span className="text-xs text-muted-foreground">
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                  </span>
                </div>
              )
            })}

            {/* Render subfolders */}
            {folder.subfolders.map((subfolderPath) => renderFolder(subfolderPath, structure, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const structure = buildFolderStructure()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Structure</CardTitle>
          <CardDescription>All files and folders in your GitHub repository</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading repository structure...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tree.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Repository Structure</CardTitle>
              <CardDescription>All files and folders in your GitHub repository</CardDescription>
            </div>
            <Button onClick={loadRepositoryTree} variant="outline" size="sm" className="gap-2 bg-transparent">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No repository data found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure your GitHub settings and ensure the repository exists
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Repository Structure</CardTitle>
            <CardDescription>All files and folders in your GitHub repository ({tree.length} items)</CardDescription>
          </div>
          <Button onClick={loadRepositoryTree} variant="outline" size="sm" className="gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[600px] overflow-y-auto">{renderFolder("", structure)}</div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Synced via app</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

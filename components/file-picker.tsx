"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Folder, FileText, FolderOpen, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TreeItem {
  path: string
  type: "blob" | "tree"
  size?: number
  sha: string
}

interface FilePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectFile: (filePath: string) => void
}

export function FilePicker({ open, onOpenChange, onSelectFile }: FilePickerProps) {
  const [tree, setTree] = useState<TreeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]))

  useEffect(() => {
    if (open) {
      loadRepositoryTree()
    }
  }, [open])

  const loadRepositoryTree = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/github-tree")
      const data = await response.json()

      if (response.ok) {
        setTree(data.tree || [])
      }
    } catch (error) {
      console.error("[v0] Error loading repository tree:", error)
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

  const handleSelectFile = (filePath: string) => {
    onSelectFile(filePath)
    onOpenChange(false)
  }

  // Filter files based on search query
  const filteredFiles = tree.filter((item) => {
    if (item.type !== "blob") return false
    if (!searchQuery) return true
    return item.path.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Build folder structure
  const buildFolderStructure = () => {
    const structure: {
      [key: string]: { files: TreeItem[]; subfolders: string[] }
    } = {
      "": { files: [], subfolders: [] },
    }

    filteredFiles.forEach((item) => {
      const pathParts = item.path.split("/")
      const folderPath = pathParts.slice(0, -1).join("/")

      if (!structure[folderPath]) {
        structure[folderPath] = { files: [], subfolders: [] }
      }
      structure[folderPath].files.push(item)
    })

    // Build subfolder relationships
    Object.keys(structure).forEach((folderPath) => {
      if (folderPath === "") return

      const pathParts = folderPath.split("/")
      const parentPath = pathParts.slice(0, -1).join("/")

      if (!structure[parentPath]) {
        structure[parentPath] = { files: [], subfolders: [] }
      }

      if (!structure[parentPath].subfolders.includes(folderPath)) {
        structure[parentPath].subfolders.push(folderPath)
      }
    })

    return structure
  }

  const renderFolder = (folderPath: string, structure: any, depth = 0) => {
    const folder = structure[folderPath]
    if (!folder || (folder.files.length === 0 && folder.subfolders.length === 0)) return null

    const isExpanded = expandedFolders.has(folderPath)
    const folderName = folderPath ? folderPath.split("/").pop() : "Root"
    const isRoot = folderPath === ""

    return (
      <div key={folderPath} className="space-y-1">
        {!isRoot && (
          <button
            onClick={() => toggleFolder(folderPath)}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 w-full text-left"
            style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{folderName}</span>
          </button>
        )}

        {(isRoot || isExpanded) && (
          <div className="space-y-1">
            {folder.files.map((file: TreeItem) => (
              <button
                key={file.path}
                onClick={() => handleSelectFile(file.path)}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted w-full text-left"
                style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.5}rem` }}
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-mono flex-1 truncate">{file.path.split("/").pop()}</span>
              </button>
            ))}

            {folder.subfolders.map((subfolderPath: string) => renderFolder(subfolderPath, structure, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const structure = buildFolderStructure()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select File from Repository</DialogTitle>
          <DialogDescription>Choose an existing file to link to your webpage</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-md p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Loading files...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No files found</p>
              </div>
            ) : (
              <div className="space-y-1">{renderFolder("", structure)}</div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

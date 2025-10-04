"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { FolderPlus, Folder } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FolderManagerProps {
  folders: { id: string; name: string; path: string }[]
  selectedFolder: string | null
  onFoldersChange: (folders: { id: string; name: string; path: string }[]) => void
  onSelectFolder: (folderId: string | null) => void
}

export function FolderManager({ folders, selectedFolder, onFoldersChange, onSelectFolder }: FolderManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderPath, setNewFolderPath] = useState("")
  const { toast } = useToast()

  const createFolder = () => {
    if (!newFolderName || !newFolderPath) {
      toast({
        title: "Missing information",
        description: "Please provide both folder name and path",
        variant: "destructive",
      })
      return
    }

    const newFolder = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFolderName,
      path: newFolderPath,
    }

    onFoldersChange([...folders, newFolder])
    setNewFolderName("")
    setNewFolderPath("")
    setIsOpen(false)

    toast({
      title: "Folder created",
      description: `${newFolderName} has been created`,
    })
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <Select
        value={selectedFolder || "none"}
        onValueChange={(value) => onSelectFolder(value === "none" ? null : value)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select folder (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No folder</span>
          </SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {folder.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Create a folder to organize your synced pages</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g., Landing Pages"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-path">Path in Repository</Label>
              <Input
                id="folder-path"
                placeholder="e.g., pages/landing"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Files will be saved to this path in your GitHub repository
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder}>Create Folder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, ExternalLink, LucideFolder, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

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

interface PageListProps {
  pages: Page[]
  folders: Folder[]
  onRemove: (id: string) => void
}

export function PageList({ pages, folders, onRemove }: PageListProps) {
  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <ExternalLink className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No pages added yet</p>
        <p className="text-xs text-muted-foreground mt-1">Add a webpage to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pages.map((page) => {
        const folder = page.folderName ? { name: page.folderName, path: page.folderPath } : null

        return (
          <Card key={page.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">{page.name}</h3>
                  {folder && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <LucideFolder className="h-3 w-3" />
                      <span>{folder.name}</span>
                    </div>
                  )}
                </div>
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                >
                  {page.url}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                {page.lastSynced && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Synced {formatDistanceToNow(page.lastSynced, { addSuffix: true })}</span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(page.id)} className="flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

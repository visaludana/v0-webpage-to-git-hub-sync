"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, ExternalLink, LucideFolder, Clock, ChevronDown, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

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

  const groupedPages = pages.reduce(
    (acc, page) => {
      const folderKey = page.folderPath || "_root"
      if (!acc[folderKey]) {
        acc[folderKey] = []
      }
      acc[folderKey].push(page)
      return acc
    },
    {} as Record<string, Page[]>,
  )

  const toggleFolder = (folderKey: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderKey)) {
      newExpanded.delete(folderKey)
    } else {
      newExpanded.add(folderKey)
    }
    setExpandedFolders(newExpanded)
  }

  return (
    <div className="space-y-3">
      {Object.entries(groupedPages).map(([folderKey, folderPages]) => {
        const isRoot = folderKey === "_root"
        const isExpanded = expandedFolders.has(folderKey)
        const folderName = isRoot ? "Root" : folderPages[0]?.folderName || folderKey

        return (
          <Collapsible key={folderKey} open={isExpanded} onOpenChange={() => toggleFolder(folderKey)}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <LucideFolder className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{folderName}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {folderPages.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 p-3 pt-0">
                  {folderPages.map((page) => (
                    <Card key={page.id} className="p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate">{page.name}</h3>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate mt-1"
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(page.id)}
                          className="flex-shrink-0 h-8 w-8"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}
    </div>
  )
}

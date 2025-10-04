import { Code2 } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Webpage Sync</h1>
            <p className="text-sm text-muted-foreground">Sync webpage source code to GitHub</p>
          </div>
        </div>
      </div>
    </header>
  )
}

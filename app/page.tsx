"use client"

import { useState } from "react"
import { PageManager } from "@/components/page-manager"
import { GitHubConfig } from "@/components/github-config"
import { Header } from "@/components/header"
import { RepositoryViewer } from "@/components/repository-viewer"
import { SitemapScanner } from "@/components/sitemap-scanner"

export default function Home() {
  const [githubConfig, setGithubConfig] = useState({
    token: "",
    owner: "",
    repo: "",
    branch: "main",
  })

  const [pageKey, setPageKey] = useState(0)

  const handlePagesAdded = () => {
    setPageKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-6">
            <GitHubConfig config={githubConfig} onConfigChange={setGithubConfig} />
            <RepositoryViewer />
          </aside>
          <div className="space-y-6">
            <SitemapScanner githubConfig={githubConfig} onPagesAdded={handlePagesAdded} />
            <PageManager key={pageKey} githubConfig={githubConfig} />
          </div>
        </div>
      </main>
    </div>
  )
}

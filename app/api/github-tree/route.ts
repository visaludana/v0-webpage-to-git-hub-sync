import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get GitHub config from database
    const { data: config, error: configError } = await supabase
      .from("git_sync_acc")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: "GitHub configuration not found" }, { status: 400 })
    }

    const { token, owner, repo, branch } = config

    if (!token || !owner || !repo) {
      return NextResponse.json({ error: "Incomplete GitHub configuration" }, { status: 400 })
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!repoResponse.ok) {
      const errorData = await repoResponse.json()
      return NextResponse.json({ error: `Repository not found: ${errorData.message}` }, { status: repoResponse.status })
    }

    const repoData = await repoResponse.json()
    const defaultBranch = branch || repoData.default_branch

    const branchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${defaultBranch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!branchResponse.ok) {
      const errorData = await branchResponse.json()
      return NextResponse.json({ error: `Branch not found: ${errorData.message}` }, { status: branchResponse.status })
    }

    const branchData = await branchResponse.json()
    const treeSha = branchData.commit.commit.tree.sha

    // Fetch repository tree using the tree SHA
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.message || "Failed to fetch repository tree" },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Transform the tree data into a more usable format
    const tree = data.tree.map((item: any) => ({
      path: item.path,
      type: item.type, // 'blob' for files, 'tree' for directories
      size: item.size,
      sha: item.sha,
    }))

    return NextResponse.json({ tree, truncated: data.truncated, branch: defaultBranch })
  } catch (error) {
    console.error("[v0] Error fetching GitHub tree:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch repository tree" },
      { status: 500 },
    )
  }
}

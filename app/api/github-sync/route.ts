import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { token, owner, repo, branch, filePath, content, message } = await request.json()

    if (!token || !owner || !repo || !filePath || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if file exists to get SHA
    const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
    const checkResponse = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "WebpageSync/1.0",
      },
    })

    let sha: string | undefined
    if (checkResponse.ok) {
      const existingFile = await checkResponse.json()
      sha = existingFile.sha
    }

    // Create or update file
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "WebpageSync/1.0",
      },
      body: JSON.stringify({
        message: message || `Update ${filePath}`,
        content: Buffer.from(content).toString("base64"),
        branch,
        ...(sha && { sha }),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[v0] GitHub API error:", error)

      let errorMessage = error.message || "Failed to push to GitHub"

      if (response.status === 403) {
        errorMessage =
          "GitHub token doesn't have permission to write to this repository. Please ensure your token has 'repo' scope (classic token) or 'Contents' read/write permissions (fine-grained token)."
      } else if (response.status === 404) {
        errorMessage = "Repository not found. Please check the owner and repository name."
      } else if (response.status === 401) {
        errorMessage = "Invalid GitHub token. Please check your token and try again."
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[v0] Error syncing to GitHub:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync to GitHub" },
      { status: 500 },
    )
  }
}

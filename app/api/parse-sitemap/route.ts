import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { sitemapUrl } = await request.json()

    console.log("[v0] Parsing sitemap:", sitemapUrl)

    if (!sitemapUrl) {
      return NextResponse.json({ error: "Sitemap URL is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(sitemapUrl)
    } catch {
      return NextResponse.json({ error: "Invalid sitemap URL format" }, { status: 400 })
    }

    // Fetch the sitemap
    console.log("[v0] Fetching sitemap from:", sitemapUrl)
    const response = await fetch(sitemapUrl)

    if (!response.ok) {
      console.error("[v0] Failed to fetch sitemap:", response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to fetch sitemap: ${response.statusText}` },
        { status: response.status },
      )
    }

    const sitemapContent = await response.text()
    console.log("[v0] Sitemap content length:", sitemapContent.length)

    // Parse XML to extract URLs
    const urlMatches = sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)
    const urls: string[] = []

    for (const match of urlMatches) {
      urls.push(match[1])
    }

    console.log("[v0] Found URLs:", urls.length)

    // Convert URLs to page entries with folder structure
    const pages = urls.map((url) => {
      try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname

        // Remove leading and trailing slashes
        const cleanPath = pathname.replace(/^\/|\/$/g, "")

        // Split path into parts
        const pathParts = cleanPath.split("/").filter((part) => part.length > 0)

        let folderPath: string | null = null
        let folderName: string | null = null
        let fileName: string

        if (pathParts.length === 0) {
          // Root path
          fileName = "index"
        } else if (pathParts.length === 1) {
          // Single level path like /about
          fileName = pathParts[0]
        } else {
          // Multi-level path like /gallery/lumora-25
          folderPath = pathParts.slice(0, -1).join("/")
          folderName = pathParts[pathParts.length - 2]
          fileName = pathParts[pathParts.length - 1]
        }

        // Determine file extension from URL or default to .html
        let fileExtension = ".html"
        if (fileName.includes(".")) {
          const parts = fileName.split(".")
          fileExtension = "." + parts.pop()
          fileName = parts.join(".")
        }

        return {
          url,
          name: fileName,
          folderPath,
          folderName,
          filePath: folderPath ? `${folderPath}/${fileName}${fileExtension}` : `${fileName}${fileExtension}`,
          fileExtension,
        }
      } catch (error) {
        console.error("[v0] Error parsing URL:", url, error)
        return null
      }
    })

    // Filter out any null entries from parsing errors
    const validPages = pages.filter((page) => page !== null)

    console.log("[v0] Valid pages:", validPages.length)
    return NextResponse.json({ pages: validPages, totalUrls: urls.length })
  } catch (error) {
    console.error("[v0] Error parsing sitemap:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse sitemap" },
      { status: 500 },
    )
  }
}

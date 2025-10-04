import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WebpageSync/1.0)",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch page: ${response.statusText}` }, { status: response.status })
    }

    const content = await response.text()

    return NextResponse.json({ content })
  } catch (error) {
    console.error("[v0] Error fetching page:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch page" },
      { status: 500 },
    )
  }
}

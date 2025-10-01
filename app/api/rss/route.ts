import { type NextRequest, NextResponse } from "next/server"

interface FeedEntry {
  title: string
  link: string
  published: string
  summary: string
  pdfLink?: string
  source?: string
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "RSS feed URL is required" }, { status: 400 })
    }

    // Fetch the RSS feed
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS Reader/1.0)",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch RSS feed")
    }

    const xmlText = await response.text()

    // Parse the RSS feed
    const entries = parseRssFeed(xmlText)

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error fetching RSS feed:", error)
    return NextResponse.json({ error: "Failed to fetch or parse RSS feed" }, { status: 500 })
  }
}

function parseRssFeed(xmlText: string): FeedEntry[] {
  const entries: FeedEntry[] = []

  // Simple XML parsing - extract items/entries
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi

  let matches = [...xmlText.matchAll(itemRegex)]
  if (matches.length === 0) {
    matches = [...xmlText.matchAll(entryRegex)]
  }

  for (const match of matches) {
    const itemXml = match[1]

    const title = extractTag(itemXml, "title")
    const link = extractTag(itemXml, "link") || extractAttribute(itemXml, "link", "href")
    const published =
      extractTag(itemXml, "pubDate") || extractTag(itemXml, "published") || extractTag(itemXml, "updated")
    const summary =
      extractTag(itemXml, "description") || extractTag(itemXml, "summary") || extractTag(itemXml, "content")

    // Extract PDF link from summary if it exists
    const pdfMatch = summary.match(/href=["']([^"']*\.pdf[^"']*)["']/i)
    const pdfLink = pdfMatch ? pdfMatch[1] : undefined

    // Extract source/category
    const source = extractTag(itemXml, "category") || extractTag(itemXml, "source")

    if (title && link) {
      entries.push({
        title: decodeHtml(title),
        link: decodeHtml(link),
        published: published || new Date().toISOString(),
        summary: decodeHtml(summary),
        pdfLink: pdfLink ? decodeHtml(pdfLink) : undefined,
        source: source ? decodeHtml(source) : undefined,
      })
    }
  }

  return entries.filter((entry) => entry.title.toLowerCase().includes("executive order"))
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, "i")
  const match = xml.match(regex)
  return match ? match[1].trim() : ""
}

function extractAttribute(xml: string, tagName: string, attrName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']*)["']`, "i")
  const match = xml.match(regex)
  return match ? match[1].trim() : ""
}

function decodeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim()
}

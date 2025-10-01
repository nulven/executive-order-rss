"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, ExternalLink, Rss, Loader2, Sparkles } from "lucide-react"

interface FeedEntry {
  title: string
  link: string
  published: string
  summary: string
  pdfLink?: string
  source?: string
  doiRelevance?: string
  doiExplanation?: string
  analyzing?: boolean
}

export function RssFeedReader() {
  const [feedUrl, setFeedUrl] = useState("")
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchFeed = async () => {
    if (!feedUrl) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: feedUrl }),
      })

      if (!response.ok) throw new Error("Failed to fetch RSS feed")

      const data = await response.json()
      setEntries(data.entries)
    } catch (err) {
      setError("Failed to load RSS feed. Please check the URL and try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeDOI = async (index: number) => {
    const entry = entries[index]

    // Update entry to show analyzing state
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, analyzing: true } : e)))

    try {
      console.log('here')
      const response = await fetch("/api/analyze-doi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.title,
          summary: entry.summary,
        }),
      })

      if (!response.ok) throw new Error("Failed to analyze document")

      const data = await response.json()

      // Update entry with analysis results
      setEntries((prev) =>
        prev.map((e, i) =>
          i === index
            ? {
                ...e,
                doiRelevance: data.relevance,
                doiExplanation: data.explanation,
                analyzing: false,
              }
            : e,
        ),
      )
    } catch (err) {
      console.error("Error analyzing DOI relevance:", err)
      setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, analyzing: false } : e)))
    }
  }

  const getRelevanceBadgeColor = (relevance: string) => {
    switch (relevance.toLowerCase()) {
      case "high":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50"
      case "none":
        return "bg-muted text-muted-foreground border-border"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Rss className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-balance">RSS Feed Reader</h1>
          </div>

          <div className="flex gap-3 max-w-3xl">
            <Input
              type="url"
              placeholder="Enter RSS feed URL..."
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchFeed()}
              className="flex-1 bg-secondary border-border"
            />
            <Button
              onClick={fetchFeed}
              disabled={loading || !feedUrl}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading
                </>
              ) : (
                "Load Feed"
              )}
            </Button>
          </div>

          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
        </div>
      </header>

      {/* Feed Entries */}
      <div className="container mx-auto px-4 py-12">
        {entries.length === 0 && !loading && (
          <div className="text-center py-20">
            <Rss className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No feed loaded</h2>
            <p className="text-muted-foreground">Enter an RSS feed URL above to get started</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {entries.map((entry, index) => (
            <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <time className="text-sm text-muted-foreground font-mono tracking-wider uppercase">
                      {new Date(entry.published).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    {entry.source && (
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                        {entry.source}
                      </span>
                    )}
                    {entry.doiRelevance && (
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getRelevanceBadgeColor(entry.doiRelevance)}`}
                      >
                        DOI: {entry.doiRelevance}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold mb-3 text-balance leading-relaxed">
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {entry.title}
                    </a>
                  </h2>

                  {entry.summary && (
                    <p className="text-muted-foreground leading-relaxed mb-4 text-pretty">
                      {entry.summary.replace(/<[^>]*>/g, "").substring(0, 300)}
                      {entry.summary.length > 300 ? "..." : ""}
                    </p>
                  )}

                  {entry.doiExplanation && (
                    <div className="mb-4 p-4 bg-secondary/50 rounded-lg border border-border">
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-semibold">DOI Analysis: </span>
                        {entry.doiExplanation}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {entry.pdfLink && (
                      <a
                        href={entry.pdfLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        View PDF
                      </a>
                    )}
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read More
                    </a>
                    {!entry.doiRelevance && (
                      <Button
                        onClick={() => analyzeDOI(index)}
                        disabled={entry.analyzing}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {entry.analyzing ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Analyzing
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-2" />
                            Analyze DOI Relevance
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

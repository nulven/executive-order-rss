import { type NextRequest, NextResponse } from "next/server"
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const contextDocs = fs.readFileSync(`${__dirname}/../../../../static/data/context.txt`);

  try {
    const { title, summary } = await request.json()

    if (!title && !summary) {
      return NextResponse.json({ error: "Title or summary is required" }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const { content } = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      messages: [{ role: "user", content: `You have been tasked with determining if the following executive order is relevant to a particular government department.

<document>
Title: ${title}
Summary: ${summary}
</document>

You have access to the following documents which are meant to provide context on the deparment as you answer the query:
<documents>
${contextDocs}
</documents>

Please remain faithful to the underlying context, and only deviate from it if you are 100% sure that you know the answer already. 

Respond with:
1. A relevance score (High, Medium, Low, or None)
2. A brief explanation (2-3 sentences) of why this document is or isn't relevant to DOI, citing specific bureaus or responsibilities when applicable

Format your response as:
Relevance: [score]
Explanation: [your explanation]` }],
      max_tokens: 500,
    })

    const text = content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    // Parse the response
    const relevanceMatch = text.match(/Relevance:\s*(High|Medium|Low|None)/i)
    const explanationMatch = text.match(/Explanation:\s*(.+)/i)

    const relevance = relevanceMatch ? relevanceMatch[1] : "Unknown"
    const explanation = explanationMatch ? explanationMatch[1].trim() : text

    return NextResponse.json({
      relevance,
      explanation,
      fullAnalysis: text,
    })
  } catch (error) {
    console.error("[v0] Error analyzing DOI relevance:", error)
    return NextResponse.json(
      { error: "Failed to analyze document", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

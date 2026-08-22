import { DocumentChunk } from "@/lib/types";
import dataset from "../data/dataset.json";

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || "";

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getQueryEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-3",
        input: [text],
      }),
    });

    if (!res.ok) {
      console.warn("Voyage embedding failed with status", res.status);
      return null;
    }

    const data = await res.json();
    return data.data[0].embedding;
  } catch (err) {
    console.warn("Voyage embedding error:", err);
    return null;
  }
}

export interface SearchOptions {
  customerScope?: string; // 'general' | 'Northstar' | 'LumenWorks'
  topK?: number;
  threshold?: number;
}

export async function searchDocumentChunks(query: string, options: SearchOptions = {}): Promise<DocumentChunk[]> {
  const { customerScope, topK = 6, threshold = 0.25 } = options;
  const chunks = dataset.document_chunks as DocumentChunk[];

  const queryEmbedding = await getQueryEmbedding(query);

  let scored: { chunk: DocumentChunk; score: number }[] = [];

  if (queryEmbedding) {
    // Vector Cosine Similarity Search
    for (const chunk of chunks) {
      if (chunk.embedding && chunk.embedding.length > 0) {
        let sim = cosineSimilarity(queryEmbedding, chunk.embedding);

        // Boost customer-specific agreements when customer scope matches
        if (customerScope && chunk.customer_scope.toLowerCase() === customerScope.toLowerCase()) {
          sim += 0.15;
        }

        // Apply authority level penalty to deprecated policies so they rank lower
        if (chunk.authority_level >= 90) {
          sim -= 0.1;
        }

        if (sim >= threshold) {
          scored.push({ chunk: { ...chunk, similarity: sim }, score: sim });
        }
      }
    }
  } else {
    // Lexical / Keyword fallback
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    for (const chunk of chunks) {
      const text = `${chunk.doc_title} ${chunk.section_title} ${chunk.content}`.toLowerCase();
      let matchCount = 0;
      for (const term of terms) {
        if (text.includes(term)) matchCount++;
      }
      let score = terms.length > 0 ? matchCount / terms.length : 0;
      if (customerScope && chunk.customer_scope.toLowerCase() === customerScope.toLowerCase()) {
        score += 0.2;
      }
      if (chunk.authority_level >= 90) {
        score -= 0.15;
      }
      if (score > 0.1) {
        scored.push({ chunk: { ...chunk, similarity: score }, score });
      }
    }
  }

  // Sort strictly by authority level first (1: Customer Agreement > 2: Policy/SOP > 3: Ops Guide), then score
  scored.sort((a, b) => {
    if (a.chunk.authority_level !== b.chunk.authority_level) {
      return a.chunk.authority_level - b.chunk.authority_level;
    }
    return b.score - a.score;
  });

  return scored.slice(0, topK).map((s) => s.chunk);
}

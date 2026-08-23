import { DocumentChunk } from "@/lib/types";
import { getServiceClient } from "@/lib/supabase/client";
import dataset from "../data/dataset.json";

function getVoyageKey() {
  return process.env.VOYAGE_API_KEY || "";
}

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
  const apiKey = getVoyageKey();
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
  const queryEmbedding = await getQueryEmbedding(query);

  // 1. Attempt live Supabase pgvector search via match_documents RPC
  if (queryEmbedding) {
    try {
      const client = getServiceClient();
      const { data, error } = await client.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: topK,
        filter_scope: customerScope || null,
      });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          source_name: d.source_name,
          doc_title: d.source_name.replace(".pdf", "").replace(/_/g, " "),
          version: d.version,
          effective_date: d.effective_date,
          section_title: d.section_title,
          content: d.content,
          customer_scope: d.customer_scope,
          authority_level: d.authority_level,
          is_authoritative: d.authority_level <= 3,
          similarity: d.similarity,
        }));
      }
    } catch (rpcErr) {
      console.warn("Supabase live match_documents RPC fallback to dataset:", rpcErr);
    }
  }

  // 2. Fallback to local cosine similarity search over dataset.json
  const chunks = dataset.document_chunks as DocumentChunk[];
  let scored: { chunk: DocumentChunk; score: number }[] = [];

  if (queryEmbedding) {
    for (const chunk of chunks) {
      if (chunk.embedding && chunk.embedding.length > 0) {
        let sim = cosineSimilarity(queryEmbedding, chunk.embedding);

        // Boost customer-specific agreements when customer scope matches
        if (customerScope && chunk.customer_scope.toLowerCase() === customerScope.toLowerCase()) {
          sim += 0.15;
        }

        // Scope filter
        if (
          !customerScope ||
          chunk.customer_scope === "general" ||
          chunk.customer_scope.toLowerCase() === customerScope.toLowerCase() ||
          (customerScope.includes("001") && chunk.customer_scope === "Northstar") ||
          (customerScope.includes("002") && chunk.customer_scope === "LumenWorks")
        ) {
          if (sim >= threshold) {
            scored.push({ chunk, score: sim });
          }
        }
      }
    }
  } else {
    // Keyword fallback if embedding API is unavailable
    const qLower = query.toLowerCase();
    for (const chunk of chunks) {
      const match =
        chunk.content.toLowerCase().includes(qLower) ||
        chunk.section_title.toLowerCase().includes(qLower) ||
        chunk.source_name.toLowerCase().includes(qLower);
      if (match) {
        scored.push({ chunk, score: 0.5 });
      }
    }
  }

  // Sort by authority level first (Tier 1 Signed Agreements first), then similarity score
  scored.sort((a, b) => {
    if (a.chunk.authority_level !== b.chunk.authority_level) {
      return a.chunk.authority_level - b.chunk.authority_level;
    }
    return b.score - a.score;
  });

  return scored.slice(0, topK).map((s) => ({
    ...s.chunk,
    similarity: s.score,
  }));
}

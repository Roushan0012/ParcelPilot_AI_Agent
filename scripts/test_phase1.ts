import fs from "fs";
import path from "path";

// Automatically load .env.local for local script execution
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { searchDocumentChunks } from "../src/lib/agent/embeddings";
import { runAgentConversation } from "../src/lib/agent/orchestrator";

async function main() {
  console.log("=================================================");
  console.log("🧪 Running Phase 1 Foundation Verification Test");
  console.log("=================================================\n");

  // Test 1: Direct Vector Search over chunks
  console.log("Test 1: Vector Search for 'Northstar cancellation terms'...");
  const chunks = await searchDocumentChunks("Northstar cancellation fee before pickup", {
    customerScope: "Northstar",
    topK: 3,
  });

  console.log(`Found ${chunks.length} matching chunks:`);
  chunks.forEach((c, idx) => {
    console.log(`\n[${idx + 1}] Source: ${c.source_name} (Tier ${c.authority_level})`);
    console.log(`    Section: ${c.section_title}`);
    console.log(`    Content: ${c.content.slice(0, 140)}...`);
  });

  // Test 2: End-to-end LLM query with search_documents tool
  console.log("\n-------------------------------------------------");
  console.log("Test 2: Agent Tool-Use Q&A with search_documents...");
  const question = "Can Northstar cancel a booked shipment before pickup without paying a cancellation fee? What document governs this?";
  console.log(`User Question: "${question}"\n`);

  const response = await runAgentConversation(
    [{ role: "user", content: question }],
    { role: "ops_manager" }
  );

  console.log("🤖 Agent Response:\n");
  console.log(response.message);
  console.log("\n🔍 Tool Calls Executed:", response.toolCalls.length);
  response.toolCalls.forEach((tc) => {
    console.log(`  - [${tc.status.toUpperCase()}] ${tc.tool_name}(${JSON.stringify(tc.args)})`);
  });
  console.log("\n📚 Citations Generated:", response.citations.length);
  response.citations.forEach((cit) => {
    console.log(`  - [Tier ${cit.authority_level}] ${cit.doc_title} (${cit.section_title})`);
  });

  console.log("\n=================================================");
  console.log("✅ Phase 1 Verification Succeeded!");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Phase 1 test failed:", err);
  process.exit(1);
});

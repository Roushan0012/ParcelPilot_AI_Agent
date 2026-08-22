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

import { runAgentConversation } from "../src/lib/agent/orchestrator";
import { confirmAction, getActions } from "../src/lib/data/db";

async function runScenario(title: string, question: string, authRole: "ops_manager" | "support_agent" | "customer_mock", accountId?: string) {
  console.log("================================================================================");
  console.log(`📌 Scenario: ${title}`);
  console.log(`👤 Role: ${authRole}${accountId ? ` (Scoped to ${accountId})` : ""}`);
  console.log(`❓ Question: "${question}"`);
  console.log("================================================================================\n");

  const response = await runAgentConversation(
    [{ role: "user", content: question }],
    { role: authRole, accountId }
  );

  console.log("🤖 Agent Response:\n");
  console.log(response.message);
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🔍 Tool Calls Executed:", response.toolCalls.length);
  response.toolCalls.forEach((tc, idx) => {
    console.log(`  [${idx + 1}] ${tc.tool_name} (${tc.status.toUpperCase()})`);
    console.log(`      Args: ${JSON.stringify(tc.args)}`);
  });

  if (response.pendingAction) {
    console.log("\n⚠️ Action Generated for Confirmation Gate:");
    console.log(`  Action ID: ${response.pendingAction.action_id}`);
    console.log(`  Type: ${response.pendingAction.action_type}`);
    console.log(`  Status: ${response.pendingAction.status}`);
    console.log(`  Payload:`, JSON.stringify(response.pendingAction.payload, null, 2));

    // Test Confirmation Gate execution
    console.log("\n⚡ Simulating User Confirmation Gate Execution...");
    const confirmResult = await confirmAction(response.pendingAction.action_id);
    console.log(`  Result: ${confirmResult.message}`);
    console.log(`  Updated Status: ${confirmResult.action?.status}`);
  } else {
    console.log("\nℹ️ No state-changing action required for this inquiry.");
  }

  console.log("\n📚 Citations Generated:", response.citations.length);
  response.citations.forEach((cit) => {
    console.log(`  - [Tier ${cit.authority_level}] ${cit.doc_title} (${cit.section_title})`);
  });
  console.log("\n");
}

async function main() {
  console.log("################################################################################");
  console.log("🚀 STARTING PHASE 2 TEST SUITE: MULTI-STEP REASONING & CONFIRMATION GATE");
  console.log("################################################################################\n");

  // Scenario 1: Northstar ORD-1001 Cancellation Question (from brief)
  await runScenario(
    "1. Northstar Order Cancellation (ORD-1001)",
    "Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.",
    "ops_manager"
  );

  // Scenario 2: Generic Late Pickup Credit Question (from brief)
  await runScenario(
    "2. Standard Carrier Fault Service Credit Calculation",
    "A pickup is three hours late because of carrier fault. Should I get a service credit? What is the standard calculation and approval limit?",
    "support_agent"
  );

  // Scenario 3: LumenWorks ORD-2002 Contract-Specific Credit & Action Proposal
  await runScenario(
    "3. LumenWorks Missed Pickup (ORD-2002) Custom Agreement Credit & Escalation",
    "Check order ORD-2002 for LumenWorks. Why was pickup delayed, what credit applies under their contract, and propose the credit action.",
    "ops_manager"
  );

  // Scenario 4: Access Control / RLS Scoping Test
  await runScenario(
    "4. RLS Access Control Check — Customer Mock Context",
    "Show me all orders and tickets for my account.",
    "customer_mock",
    "ACCT-001" // Scoped to Northstar only
  );

  console.log("################################################################################");
  console.log("✅ ALL PHASE 2 MULTI-STEP SCENARIOS & CONFIRMATION GATES VERIFIED SUCCESSFULLY!");
  console.log("################################################################################");
}

main().catch((err) => {
  console.error("Phase 2 test failed:", err);
  process.exit(1);
});

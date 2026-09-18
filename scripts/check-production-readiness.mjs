import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const blockers = [];
const environment = process.env;
const workingTree = spawnSync("git", ["status", "--porcelain"], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: false,
});

if (workingTree.error || workingTree.status !== 0) {
  blockers.push("Git working-tree status could not be verified");
} else if (workingTree.stdout.trim().length > 0) {
  blockers.push("The production working tree must be clean and committed");
}

if (environment.DEPLOYMENT_STAGE !== "production") {
  blockers.push("DEPLOYMENT_STAGE must equal production");
}

if (environment.ALLOW_UNVERIFIED_EMAIL !== "false") {
  blockers.push("ALLOW_UNVERIFIED_EMAIL must equal false");
}

if (environment.EMAIL_VERIFICATION_ENABLED !== "true") {
  blockers.push("EMAIL_VERIFICATION_ENABLED must equal true");
}

if (environment.SUPABASE_PROJECT_STAGE !== "production") {
  blockers.push("SUPABASE_PROJECT_STAGE must equal production");
}

if (!environment.PREVIEW_SUPABASE_URL) {
  blockers.push("PREVIEW_SUPABASE_URL must identify the preview project");
} else if (
  !environment.NEXT_PUBLIC_SUPABASE_URL ||
  environment.NEXT_PUBLIC_SUPABASE_URL === environment.PREVIEW_SUPABASE_URL
) {
  blockers.push("Production must not use the preview Supabase project URL");
}

const securityGateFile = environment.SECURITY_GATE_FILE;
if (!securityGateFile) {
  blockers.push(
    "SECURITY_GATE_FILE must identify approved production evidence",
  );
} else {
  try {
    const evidence = JSON.parse(
      readFileSync(resolve(securityGateFile), "utf8"),
    );

    if (evidence.approvedForProduction !== true) {
      blockers.push("The security gate does not approve production");
    }
    if (evidence.unresolvedCriticalFindings !== 0) {
      blockers.push("Critical security findings remain unresolved");
    }
    if (evidence.unresolvedHighFindings !== 0) {
      blockers.push("High security findings remain unresolved");
    }
  } catch {
    blockers.push("SECURITY_GATE_FILE is missing or invalid JSON");
  }
}

if (blockers.length > 0) {
  console.error("Production deployment blocked:");
  blockers.forEach((blocker) => console.error(`- ${blocker}`));
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    console.error(
      `Production deployment blocked: ${command} ${args.join(" ")} failed`,
    );
    process.exit(1);
  }
}

run("npm", ["run", "verify"]);
run("npm", ["audit", "--audit-level=high"]);

const gitleaks = spawnSync("gitleaks", ["version"], { stdio: "ignore" });
if (gitleaks.status !== 0) {
  console.error(
    "Production deployment blocked: install Gitleaks before running the production gate",
  );
  process.exit(1);
}

run("gitleaks", ["git", "--redact", "--no-banner"]);
console.log("Production readiness gate passed.");

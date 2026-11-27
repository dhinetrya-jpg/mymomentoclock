import asyncio
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path
from google.adk.agents import LlmAgent, SequentialAgent, LoopAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

REPO_ROOT = Path(__file__).resolve().parent

# 1. Load OPENROUTER_API_KEY from .env in the exact same folder as agent.py
env_file = REPO_ROOT / ".env"
if env_file.exists():
    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if line.startswith("OPENROUTER_API_KEY="):
            parts = line.split("=", 1)[1]
            if len(parts) == 2:
                key_val = parts[1].strip().strip('"').strip("'")
                if key_val:
                    os.environ["OPENROUTER_API_KEY"] = key_val
                    break

if not os.environ.get("OPENROUTER_API_KEY"):
    raise RuntimeError(
        f"OPENROUTER_API_KEY is missing or empty.\n"
        f"Run this in PowerShell inside {REPO_ROOT}:\n"
        f'  Set-Content -Path .env -Value "OPENROUTER_API_KEY=sk-or-v1-your-actual-key"'
    )

# 2. Auto-discover live $0 tool-capable models on OpenRouter
def discover_openrouter_free_models() -> tuple[str, str]:
    preferred_reasoning = [
        "nvidia/nemotron-3.5-super-vl:free",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "deepseek/deepseek-r1:free",
        "nvidia/nemotron-3.5-lightning:free",
    ]
    preferred_coding = [
        "cohere/north-mini-code:free",
        "recursive/flint-v1.0:free",
        "nvidia/nemotron-3.5-lightning:free",
        "nvidia/nemotron-3.5-super-vl:free",
    ]
    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            models = json.loads(resp.read().decode("utf-8")).get("data", [])

        free_with_tools = sorted(
            m["id"]
            for m in models
            if str(m.get("pricing", {}).get("prompt", "1")) == "0"
            and str(m.get("pricing", {}).get("completion", "1")) == "0"
            and "tools" in m.get("supported_parameters", [])
        )
        print(f"Found {len(free_with_tools)} active free tool-capable models on OpenRouter.")

        r_slug = next((m for m in preferred_reasoning if m in free_with_tools), None)
        c_slug = next((m for m in preferred_coding if m in free_with_tools), None)

        if not r_slug and free_with_tools:
            r_slug = free_with_tools[0]
        if not c_slug and free_with_tools:
            c_slug = free_with_tools[-1]

        reasoning_model = f"openrouter/{r_slug}" if r_slug else "openrouter/openrouter/free"
        coding_model = f"openrouter/{c_slug}" if c_slug else "openrouter/openrouter/free"
        return reasoning_model, coding_model
    except Exception as exc:
        print(f"Warning: Model auto-discovery fallback triggered ({exc}).")
        return "openrouter/openrouter/free", "openrouter/openrouter/free"

REASONING_MODEL_ID, CODING_MODEL_ID = discover_openrouter_free_models()
print(f"Architect & Security Model : {REASONING_MODEL_ID}")
print(f"Coding Tracks Model        : {CODING_MODEL_ID}\n")

MODEL_ARCHITECT_QA = LiteLlm(
    model=REASONING_MODEL_ID,
    fallbacks=["openrouter/openrouter/free"],
)
MODEL_CODER = LiteLlm(
    model=CODING_MODEL_ID,
    fallbacks=[REASONING_MODEL_ID, "openrouter/openrouter/free"],
)

# 3. Sandboxed Repository Tools (with 3.5s pacing for OpenRouter free RPM limits)
def list_repo_files(subpath: str = ".") -> str:
    """List files inside a repository subfolder."""
    time.sleep(3.5)
    target = (REPO_ROOT / subpath).resolve()
    if not str(target).startswith(str(REPO_ROOT)) or not target.exists():
        return f"ERROR: Invalid path: {subpath}"
    files = [
        str(p.relative_to(REPO_ROOT)).replace("\\", "/")
        for p in target.rglob("*")
        if p.is_file()
        and ".git" not in p.parts
        and "node_modules" not in p.parts
        and "dist" not in p.parts
    ]
    return "\n".join(sorted(files)[:150])

def read_file(rel_path: str, start_line: int = 1, max_lines: int = 220) -> str:
    """Read a specific line range of a repository file."""
    time.sleep(3.5)
    target = (REPO_ROOT / rel_path).resolve()
    if not str(target).startswith(str(REPO_ROOT)) or not target.is_file():
        return f"ERROR: File not found: {rel_path}"
    lines = target.read_text(encoding="utf-8", errors="replace").splitlines()
    start_idx = max(0, start_line - 1)
    end_idx = min(len(lines), start_idx + max_lines)
    numbered = [f"{i + 1}: {lines[i]}" for i in range(start_idx, end_idx)]
    header = f"FILE: {rel_path} (lines {start_idx + 1}-{end_idx} of {len(lines)})\n"
    return header + "\n".join(numbered)[:14000]

def write_file(rel_path: str, content: str) -> str:
    """Write complete content to a file inside the repository."""
    time.sleep(3.5)
    target = (REPO_ROOT / rel_path).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        return "ERROR: Path outside repository."
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"OK: Saved {rel_path} ({len(content)} chars)"

def run_check(command: str) -> str:
    """Run allowed build, lint, test, or git status commands."""
    time.sleep(3.5)
    allowed = ("npm run lint", "npm run build", "go test", "go vet", "git status", "git diff")
    if not command.strip().startswith(allowed):
        return f"BLOCKED: Only commands starting with {allowed} are permitted."
    try:
        proc = subprocess.run(
            command, shell=True, cwd=REPO_ROOT, capture_output=True, text=True, timeout=180
        )
        out = f"EXIT={proc.returncode}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        return out[:12000]
    except Exception as exc:
        return f"ERROR: {exc}"

TOOLS = [list_repo_files, read_file, write_file, run_check]

# 4. Sequential Specialized Agent Squad
architect_agent = LlmAgent(
    name="DomainArchitect",
    model=MODEL_ARCHITECT_QA,
    instruction=(
        "You are the Lead Architect for mymomentoclock. Call list_repo_files('.') and read README.md. "
        "Create docs/EXECUTION_ROADMAP.md mapping the exact Dec 15 launch blockers: "
        "(1) F01-P0-05 numerical acceptance & Rashi+Sripati dual placement with STABLE/VARIABLE/UNRESOLVED "
        "uncertainty, (2) PWA manifest.json + service worker in public/, and (3) hardened payment webhooks & SSE."
    ),
    tools=TOOLS,
)

backend_agent = LlmAgent(
    name="CoreMathGoAgent",
    model=MODEL_CODER,
    instruction=(
        "You are Track A (Go Backend & Core Math). Read docs/EXECUTION_ROADMAP.md, normalization_engine.go, "
        "and btr_processor.go. Ensure Rashi and Sripati Bhava Chalit placements remain separate with a "
        "birthTimeSensitivity classification ('STABLE' | 'VARIABLE' | 'UNRESOLVED')—never auto-locking "
        "a single BTR timestamp or using arbitrary 60/40 weights. Run 'go test ./...' to verify."
    ),
    tools=TOOLS,
)

frontend_agent = LlmAgent(
    name="PwaFrontendAgent",
    model=MODEL_CODER,
    instruction=(
        "You are Track B (Frontend PWA & Midnight Velvet UI). Inspect public/ and src/App.tsx. "
        "Ensure public/manifest.json (name: 'MyMomentOclock', theme_color: '#0B0C10', background_color: '#0B0C10', "
        "display: 'standalone') and an offline service worker public/sw.js exist and are registered. "
        "Run 'npm run lint' and 'npm run build' to verify."
    ),
    tools=TOOLS,
)

payments_agent = LlmAgent(
    name="PaymentsSecurityAgent",
    model=MODEL_CODER,
    instruction=(
        "You are Track C (Payments & Webhook Hardening). Inspect server.ts and transactional_webhook.go. "
        "Verify HMAC SHA-256 signature enforcement and SSE unlock (/api/payment/sse/:token) without leaving "
        "mock payment bypasses active in production routes. Run 'npm run lint' and 'go test ./...' to verify."
    ),
    tools=TOOLS,
)

qa_security_agent = LlmAgent(
    name="DeepResearchSecurityQA",
    model=MODEL_ARCHITECT_QA,
    instruction=(
        "You are Track D (Security & QA Auditor). Run 'git status', 'go test ./...', 'npm run lint', and "
        "'npm run build'. Audit modified files for OWASP vulnerabilities, webhook replay flaws, or broken builds. "
        "Fix any build/lint issues found and write empirical test results to docs/RELEASE_STATUS.md."
    ),
    tools=TOOLS,
)

qa_loop = LoopAgent(
    name="VerificationLoop",
    sub_agents=[qa_security_agent],
    max_iterations=2,
)

release_gatekeeper = LlmAgent(
    name="CeoReleaseSignoff",
    model=MODEL_ARCHITECT_QA,
    instruction=(
        "You are the CEO & Release Manager Gatekeeper. Read docs/RELEASE_STATUS.md and run 'git status'. "
        "Write an executive summary of completed work, test pass/fail results, remaining Dec 15 blockers, "
        "and an explicit GO or NO-GO status at the top of docs/RELEASE_STATUS.md."
    ),
    tools=TOOLS,
)

root_agent = SequentialAgent(
    name="MymomentOclockOpenRouterPipeline",
    sub_agents=[
        architect_agent,
        backend_agent,
        frontend_agent,
        payments_agent,
        qa_loop,
        release_gatekeeper,
    ],
)

# 5. Single-Run Entrypoint
async def main():
    print("Starting MyMomentOclock OpenRouter Sequential Agent Squad...\n")
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name="mymomentoclock", user_id="founder")
    runner = Runner(agent=root_agent, app_name="mymomentoclock", session_service=session_service)

    user_msg = types.Content(
        role="user",
        parts=[
            types.Part(
                text=user_msg = types.Content(
        role="user",
        parts=[
            types.Part(
                text=(
                    "Execute Milestone 1 sequentially across Architect, Go Backend, PWA Frontend, "
                    "Payments Security, QA Loop, and CEO Release Sign-Off."
                )
            )
        ],
    )
    async for event in runner.run_async(
        user_id="founder", session_id=session.id, new_message=user_msg
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    print(f"=== [{event.author}] ===\n{part.text}\n")


if __name__ == "__main__":
    asyncio.run(main())


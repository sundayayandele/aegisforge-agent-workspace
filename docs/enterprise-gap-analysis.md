# Nami enterprise gap analysis

Reviewed 13 September 2026 against the live Nami site and source commit
`35fd1702da88b3a97efdbe119a401596a999f044`. Sunday Ayandele's fork and the
upstream repository were at the same commit when reviewed.

## Executive assessment

Nami is a strong local desktop **workbench**. It is not yet an enterprise agent
platform. Its advantage is transparency: real agent CLIs run in visible panes,
projects are folder-scoped, no Nami account is required, and the code already
contains thoughtful Electron isolation and security tests. Its architectural
limit is equally important: Nami supervises terminal processes but does not sit
between those agents and every shell, file, browser, MCP, identity or network
action they perform.

The enterprise opportunity is therefore not “add an admin page.” It is to keep
the excellent local workbench while introducing a mediated execution plane and
an optional organizational control plane.

## What is already present

| Capability | Evidence in the reviewed product | Enterprise interpretation |
| --- | --- | --- |
| Multi-agent desktop | Multiple CLI sessions in separate PTY panes | Strong operator experience |
| Local-first project boundary | User chooses one folder; document paths are containment-checked | Good starting boundary, not OS-level isolation |
| Agent portability | Claude Code, Codex, Gemini, OpenCode, Hermes, Kimi and custom models | Avoids model/vendor lock-in |
| Skills and MCP services | Local library, connection masters and per-agent delivery | Useful ecosystem layer; needs trust controls |
| Electron hardening | Sandboxed views, context isolation, no renderer Node integration, trusted IPC | Better than a typical early Electron app |
| Browser separation | Per-session access grants and encrypted credential vault | Useful base for delegated browser work |
| Local voice | On-device Whisper path | Supports privacy and disconnected operation |
| Reliability basics | Restored sessions, update checks, many automated tests | Good desktop resilience |

## Missing enterprise capabilities

| Priority | Missing capability | Why an enterprise needs it | Product direction |
| --- | --- | --- | --- |
| P0 | Tool-call mediation | A CLI process can still act with the user's ambient OS permissions | Put shell, file, network, browser and MCP actions behind an Agent Gateway |
| P0 | Agent workload identity | Shared user credentials make attribution and revocation weak | Issue short-lived, per-agent/per-task identities and scoped tokens |
| P0 | Human approval workflow | High-impact actions need accountable, explicit oversight | Risk-based approvals, four-eyes rules, expiry, break-glass and kill switch |
| P0 | Enterprise audit and traces | Local terminal output is not a durable control record | Structured events, signed/tamper-evident logs, OpenTelemetry, SIEM export |
| P0 | Secrets brokering | Environment variables are broadly inherited by sessions | Vault integration, just-in-time secret lease, redaction and rotation |
| P0 | Extension supply-chain trust | Skills, plugins and MCP servers behave like executable dependencies | Signed catalog, SBOM, provenance, scanning, allowlists and quarantine |
| P1 | SSO, SCIM and RBAC/ABAC | Teams need lifecycle management and separation of duties | OIDC/SAML, SCIM provisioning, roles plus context-aware policy |
| P1 | Multi-tenancy and workspace isolation | One local user-data store cannot support departments or clients safely | Tenant/project namespaces, encryption keys and strict data boundaries |
| P1 | Model gateway and registry | Enterprises must control model choice, data routes, spend and residency | Approved-model catalog, routing, fallbacks, quotas and residency tags |
| P1 | Evaluation and change management | Agent/prompts/skills can regress silently | Versioned artifacts, test suites, policy-as-code and promotion gates |
| P1 | DLP and data classification | Agents can copy regulated data into prompts, tools or logs | Labels, content inspection, egress policy, masking and retention controls |
| P1 | Operational controls | Long-running work needs bounded, recoverable execution | Queues, retries, idempotency keys, budgets, timeouts and circuit breakers |
| P2 | Collaboration | Local panes do not provide assignment, review or shared state | Shared tasks, comments, handoff, ownership and evidence bundles |
| P2 | Fleet administration | Enterprises need controlled desktop rollout and configuration | MDM packages, update rings, proxy support, health inventory and remote policy |
| P2 | Air-gapped deployment | Sovereign and regulated environments may have no public network | Offline bundles, private registries, local models and disconnected updates |
| P2 | Compliance evidence | Controls must map to use cases and accountable owners | AI inventory, risk classification, FRIA/DPIA support and evidence exports |

## Why these gaps matter now

- The [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
  focuses specifically on risks such as goal hijacking, tool misuse, identity and
  privilege abuse, supply-chain compromise and unexpected code execution.
- [NIST's AI Risk Management Framework resources](https://airc.nist.gov/)
  organize AI risk work around governance, mapping, measurement and management;
  a workspace must generate evidence for those activities, not only run agents.
- The European Commission's [AI Act overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
  emphasizes monitoring and human oversight responsibilities after deployment.
- [OpenTelemetry's GenAI guidance](https://opentelemetry.io/blog/2026/inside-the-llm-call/)
  provides a vendor-neutral direction for correlating model, agent and tool
  activity across service boundaries.

## Recommended differentiation

Position AegisForge as **the governed, sovereign agent workspace**:

1. Local experience as approachable as Nami.
2. Every consequential action passes through a visible policy boundary.
3. Models, skills and MCP servers are replaceable and provenance-checked.
4. The same desktop can operate standalone, connected to a company control
   plane, or fully air-gapped.
5. Policy and audit use open formats so a customer is not trapped in the product.

## Current implementation slice

The new repository implements the first narrow slice:

- Observe, Guarded and Locked local policy profiles.
- Launch-intent classification for destructive command patterns.
- Blocking at session start according to the selected profile.
- Append-only JSONL audit records with a SHA-256 hash chain.
- Prompt minimization: audit records store an intent hash rather than raw text.
- A Governance page in Settings with integrity status and recent decisions.

This is deliberately labelled **launch preflight**. It must not be presented as
full runtime enforcement until the Agent Gateway mediates individual tool calls.

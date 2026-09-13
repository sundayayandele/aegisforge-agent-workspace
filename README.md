# AegisForge Agent Workspace

A local-first, model-agnostic desktop workspace for running Claude Code, Codex,
Gemini, OpenCode, Hermes, Kimi and other agent CLIs side by side—with a
governance boundary that can evolve into an enterprise control plane.

This project is an MIT-licensed derivative of
[Nami](https://github.com/mrdainami/nami). It retains Nami's strong desktop
workbench foundation and adds enterprise-oriented policy, audit and packaging
work. See [NOTICE.md](NOTICE.md) for attribution.

## What works now

- Real agent CLIs run in isolated terminal panes through Electron and `node-pty`.
- Projects remain folder-scoped and sessions restore after restart.
- Agent, skill and MCP/service discovery remains local-first.
- Sandboxed renderer and browser views use a narrow, trusted IPC bridge.
- Browser credentials use operating-system protected storage.
- A governance preflight evaluates every terminal or agent-session launch.
- Three local profiles are available: Observe, Guarded and Locked.
- Governance decisions are written to a tamper-evident SHA-256 hash chain.
- Audit events retain an intent hash, not the original prompt or command text.
- Linux, Windows and macOS package targets are declared.

The current governance preflight is a useful first boundary, not a complete
enterprise security system. It evaluates launch intent; it does not yet mediate
every tool call made inside a third-party agent CLI. That requires the Agent
Gateway described in the architecture document.

## Quick start

Requirements: Node.js 20+ and the build tools needed by Electron native modules.

```bash
npm install
npm start
```

Open **Settings → Governance** to select a policy profile and inspect recent
decisions.

## Test

```bash
npm test
npm run check:security
```

## Package

```bash
npm run dist:linux
npm run dist:windows
npm run dist:mac
```

Cross-platform signing is intentionally not automated yet. Production releases
should use separate trusted CI runners and native signing identities for Apple
and Microsoft packages.

## Documentation

- [Enterprise gap analysis](docs/enterprise-gap-analysis.md)
- [Target architecture and roadmap](docs/enterprise-architecture.md)
- [Original interaction design](docs/design.md)
- [Keyboard shortcuts](docs/shortcuts.md)

## Enterprise roadmap

The next priority is a local Agent Gateway that mediates file, shell, network,
MCP and secret access at tool-call time. After that: organizational identity,
central policy distribution, approval workflows, OpenTelemetry export, signed
extension catalogs, model routing and collaborative workspaces.

## License

MIT. Copyright notices from the upstream Nami project are preserved in
[LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

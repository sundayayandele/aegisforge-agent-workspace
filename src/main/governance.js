const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROFILES = ['observe', 'guarded', 'locked'];
const DEFAULT_POLICY = Object.freeze({
  version: 1,
  profile: 'observe',
  retainAuditDays: 90,
});

const RULES = Object.freeze([
  { id: 'terminal.wipe-root', risk: 'critical', re: /\brm\s+-[^\n]*r[^\n]*f[^\n]*(?:\/\s|--no-preserve-root)/i },
  { id: 'terminal.raw-disk-write', risk: 'critical', re: /\bdd\s+[^\n]*\bof=\/dev\//i },
  { id: 'infra.destructive-change', risk: 'high', re: /\b(?:terraform\s+destroy|kubectl\s+delete|helm\s+uninstall)\b/i },
  { id: 'source.force-push', risk: 'high', re: /\bgit\s+push\b[^\n]*(?:--force|-f\b)/i },
  { id: 'supply-chain.remote-script', risk: 'high', re: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/i },
  { id: 'data.secret-exposure', risk: 'high', re: /\b(?:printenv|env)\b[^\n]*(?:secret|token|password|api[_-]?key)/i },
  { id: 'release.publish', risk: 'medium', re: /\b(?:npm\s+publish|docker\s+push|gh\s+release\s+create)\b/i },
]);

function normalizePolicy(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const profile = PROFILES.includes(source.profile) ? source.profile : DEFAULT_POLICY.profile;
  const days = Number(source.retainAuditDays);
  return {
    version: 1,
    profile,
    retainAuditDays: Number.isInteger(days) && days >= 1 && days <= 3650 ? days : DEFAULT_POLICY.retainAuditDays,
  };
}

function readPolicy(file) {
  try { return normalizePolicy(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch (_) { return { ...DEFAULT_POLICY }; }
}

function writePolicy(file, patch) {
  const next = normalizePolicy({ ...readPolicy(file), ...(patch || {}) });
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, file);
  return next;
}

function launchText(input) {
  return [input && input.command, input && input.program, input && input.seed]
    .filter((value) => typeof value === 'string')
    .join('\n')
    .slice(0, 20000);
}

function assessLaunch(input, policy) {
  const active = normalizePolicy(policy);
  const text = launchText(input);
  const matches = RULES.filter((rule) => rule.re.test(text)).map(({ id, risk }) => ({ id, risk }));
  const critical = matches.some((match) => match.risk === 'critical');
  const elevated = matches.some((match) => ['critical', 'high'].includes(match.risk));
  let decision = matches.length ? 'review' : 'allow';
  if (active.profile === 'guarded' && critical) decision = 'block';
  if (active.profile === 'locked' && elevated) decision = 'block';
  return {
    decision,
    profile: active.profile,
    risk: critical ? 'critical' : elevated ? 'high' : matches.length ? 'medium' : 'low',
    matchedRules: matches,
  };
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

function digest(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }

function readLines(file) {
  try { return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)); }
  catch (_) { return []; }
}

function appendAudit(file, event) {
  const rows = readLines(file);
  const previousHash = rows.length ? rows[rows.length - 1].hash : 'GENESIS';
  const body = {
    version: 1,
    at: new Date().toISOString(),
    previousHash,
    ...event,
  };
  const row = { ...body, hash: digest(previousHash + canonical(body)) };
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.appendFileSync(file, JSON.stringify(row) + '\n', { mode: 0o600 });
  return row;
}

function verifyAudit(rows) {
  let previousHash = 'GENESIS';
  for (const row of rows) {
    const { hash, ...body } = row;
    if (body.previousHash !== previousHash || hash !== digest(previousHash + canonical(body))) return false;
    previousHash = hash;
  }
  return true;
}

function auditStatus(file, limit = 25) {
  const rows = readLines(file);
  return { integrity: verifyAudit(rows), count: rows.length, events: rows.slice(-Math.max(1, Math.min(limit, 200))).reverse() };
}

function launchAuditEvent(input, verdict) {
  const text = launchText(input);
  return {
    type: verdict.decision === 'block' ? 'session.blocked' : 'session.preflight',
    decision: verdict.decision,
    risk: verdict.risk,
    profile: verdict.profile,
    rules: verdict.matchedRules.map((rule) => rule.id),
    sessionId: String(input && input.id || '').slice(0, 120),
    agentKind: String(input && input.kind || 'shell').slice(0, 40),
    workspace: path.basename(String(input && input.cwd || '')),
    intentHash: digest(text),
  };
}

module.exports = {
  PROFILES, DEFAULT_POLICY, RULES, normalizePolicy, readPolicy, writePolicy,
  assessLaunch, appendAudit, auditStatus, verifyAudit, launchAuditEvent,
};

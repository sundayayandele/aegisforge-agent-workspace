import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const governance = require('../src/main/governance.js');

test('policy profiles fail safely to observe and retention is bounded', () => {
  assert.deepEqual(governance.normalizePolicy({ profile: 'unknown', retainAuditDays: 0 }), {
    version: 1, profile: 'observe', retainAuditDays: 90,
  });
  assert.equal(governance.normalizePolicy({ profile: 'locked', retainAuditDays: 365 }).profile, 'locked');
});

test('observe reports risk while guarded and locked enforce their thresholds', () => {
  const critical = { command: 'rm -rf / --no-preserve-root' };
  assert.equal(governance.assessLaunch(critical, { profile: 'observe' }).decision, 'review');
  assert.equal(governance.assessLaunch(critical, { profile: 'guarded' }).decision, 'block');
  assert.equal(governance.assessLaunch({ command: 'git push --force origin main' }, { profile: 'guarded' }).decision, 'review');
  assert.equal(governance.assessLaunch({ command: 'git push --force origin main' }, { profile: 'locked' }).decision, 'block');
  assert.equal(governance.assessLaunch({ command: 'npm test' }, { profile: 'locked' }).decision, 'allow');
});

test('audit records form a tamper-evident hash chain without storing prompt text', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegisforge-governance-'));
  const file = path.join(dir, 'audit.jsonl');
  try {
    const secretPrompt = 'deploy customer alpha with token SECRET-123';
    const verdict = governance.assessLaunch({ seed: secretPrompt }, { profile: 'observe' });
    governance.appendAudit(file, governance.launchAuditEvent({ id: 's1', kind: 'run', cwd: '/tmp/acme', seed: secretPrompt }, verdict));
    governance.appendAudit(file, { type: 'policy.changed', profile: 'guarded' });
    const status = governance.auditStatus(file);
    assert.equal(status.integrity, true);
    assert.equal(status.count, 2);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /SECRET-123/);
    const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
    rows[0].risk = 'critical';
    assert.equal(governance.verifyAudit(rows), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('policy writes are atomic and round-trip through disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegisforge-policy-'));
  const file = path.join(dir, 'governance.json');
  try {
    governance.writePolicy(file, { profile: 'guarded', retainAuditDays: 180 });
    assert.deepEqual(governance.readPolicy(file), { version: 1, profile: 'guarded', retainAuditDays: 180 });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

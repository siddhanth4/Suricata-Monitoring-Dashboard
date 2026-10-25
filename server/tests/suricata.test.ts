import assert from 'assert';
import { ParserService } from '../services/parserService.ts';
import { DatabaseService } from '../config/database.ts';
import { RawEveEvent } from '../types/index.ts';

async function runTests() {
  console.log('--- Starting Suricata SOC Test Suite ---');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then(() => {
            console.log(`  ✓ ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ✗ ${name}:`, err.message);
            failed++;
          });
      }
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${name}:`, msg);
      failed++;
    }
  }

  // 1. JSON Parsing Tests
  test('EVE JSON parsing of valid line', () => {
    const raw = '{"timestamp":"2026-10-17T08:00:00Z","event_type":"alert","src_ip":"10.0.0.1"}';
    const res = ParserService.parseJsonLine(raw);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.src_ip, '10.0.0.1');
    assert.strictEqual(res.data?.event_type, 'alert');
  });

  test('Malformed JSON handling', () => {
    const raw = '{"timestamp": malformed JSON here';
    const res = ParserService.parseJsonLine(raw);
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes('Malformed JSON'));
  });

  test('Empty line handling', () => {
    const res = ParserService.parseJsonLine('   ');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Empty line');
  });

  // 2. Action and Verdict Semantics Tests
  test('Action classification: Explicit drop verdict yields DROP', () => {
    const event: RawEveEvent = {
      event_type: 'alert',
      alert: { action: 'blocked', signature: 'Test Drop' },
      verdict: 'drop',
    };
    const res = ParserService.determineAction(event);
    assert.strictEqual(res.action, 'DROP');
    assert.ok(res.evidence.includes('confirmed DROP'));
  });

  test('Action classification: Standard IDS alert yields ALERT (not DROP)', () => {
    const event: RawEveEvent = {
      event_type: 'alert',
      alert: { action: 'allowed', signature: 'Test IDS Alert', severity: 1 },
    };
    const res = ParserService.determineAction(event);
    assert.strictEqual(res.action, 'ALERT');
    assert.ok(res.evidence.includes('passive') || res.evidence.includes('detection-only'));
  });

  test('Action classification: Explicit reject yields REJECT', () => {
    const event: RawEveEvent = {
      event_type: 'alert',
      alert: { action: 'reject' },
    };
    const res = ParserService.determineAction(event);
    assert.strictEqual(res.action, 'REJECT');
  });

  test('Action classification: Telemetry flow yields UNKNOWN action', () => {
    const event: RawEveEvent = {
      event_type: 'flow',
      src_ip: '192.168.1.1',
    };
    const res = ParserService.determineAction(event);
    assert.strictEqual(res.action, 'UNKNOWN');
  });

  // 3. Missing and Nullable Fields Tests
  test('Nullable & missing fields normalization', () => {
    const bareEvent: RawEveEvent = {
      timestamp: '2026-10-17T09:00:00Z',
      event_type: 'dns',
    };
    const normalized = ParserService.normalizeEvent(bareEvent, 'api-ingest');
    assert.strictEqual(normalized.sourceIP, null);
    assert.strictEqual(normalized.sourcePort, null);
    assert.strictEqual(normalized.destinationIP, null);
    assert.strictEqual(normalized.destinationPort, null);
    assert.strictEqual(normalized.signature, null);
    assert.strictEqual(normalized.severity, null);
    assert.strictEqual(normalized.category, 'Unclassified');
    assert.strictEqual(normalized.protocol, 'UNKNOWN');
    assert.strictEqual(normalized.action, 'UNKNOWN');
  });

  // 4. Stable Deduplication Key Tests
  test('Deduplication key consistency', () => {
    const eventA: RawEveEvent = {
      timestamp: '2026-10-17T08:00:00.000Z',
      flow_id: 12345,
      event_type: 'alert',
      src_ip: '1.2.3.4',
      src_port: 80,
      dest_ip: '5.6.7.8',
      dest_port: 443,
      proto: 'TCP',
      alert: { signature_id: 2001 },
    };
    const key1 = ParserService.generateDedupKey(eventA, '2026-10-17T08:00:00.000Z');
    const key2 = ParserService.generateDedupKey(eventA, '2026-10-17T08:00:00.000Z');
    assert.strictEqual(key1, key2);

    const eventB: RawEveEvent = { ...eventA, src_port: 81 };
    const key3 = ParserService.generateDedupKey(eventB, '2026-10-17T08:00:00.000Z');
    assert.notStrictEqual(key1, key3);
  });

  // 5. Database Service Persistence & Deduplication
  await test('Database persistence and deduplication', async () => {
    const raw: RawEveEvent = {
      timestamp: '2026-10-17T10:15:00Z',
      flow_id: 987654,
      event_type: 'alert',
      src_ip: '10.20.30.40',
      src_port: 5555,
      dest_ip: '10.20.30.50',
      dest_port: 80,
      proto: 'TCP',
      alert: {
        signature: 'ET TEST Intrusion Signature',
        signature_id: 999999,
        category: 'Test Category',
        severity: 1,
        action: 'allowed',
      },
    };

    const normalized = ParserService.normalizeEvent(raw, 'suricata-tail');

    const firstSave = await DatabaseService.saveEvent(normalized);
    assert.strictEqual(firstSave.isNew, true);

    // Second save of exact same event
    const secondSave = await DatabaseService.saveEvent(normalized);
    assert.strictEqual(secondSave.isNew, false);
  });

  // 6. Statistics Calculations
  await test('Statistics overview calculation', async () => {
    const stats = await DatabaseService.getStatsOverview({ timeRange: 'all' });
    assert.ok(stats.totalEvents >= 1);
    assert.ok(typeof stats.criticalAlerts === 'number');
    assert.ok(typeof stats.uniqueSourceIPs === 'number');
    assert.ok(typeof stats.enforcementMode === 'string');
  });

  console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

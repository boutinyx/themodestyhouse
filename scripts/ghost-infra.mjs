#!/usr/bin/env node
/**
 * Provision Ghost's infrastructure on Railway and Cloudflare. Idempotent: anything that
 * already exists is left alone, so it is safe to re-run.
 *
 *   RAILWAY_API_KEY=… CLOUDFLARE_API_TOKEN=… node scripts/ghost-infra.mjs
 *
 * Creates ONLY: Railway services `mysql` and `ghost` (+ a volume each, variables, a custom
 * domain) and one DNS-only CNAME `cms`. It does not touch the existing site services.
 *
 * Secrets (the MySQL passwords) are generated here, written straight into Railway variables
 * and NEVER printed. Mailgun settings are not set here: they need Tina's Mailgun account
 * (scripts/ghost-infra.mjs mail step is a separate, later run with MAILGUN_API_KEY set).
 *
 * Design: docs/superpowers/specs/2026-09-07-ghost-headless-cms-design.md, "Railway (new)".
 */
import { randomBytes } from 'node:crypto';

const RAILWAY = 'https://backboard.railway.com/graphql/v2';
const PROJECT_ID = 'a923e5d7-a5c4-4d59-a1e3-eece1f9b68ce'; // distinguished-expression
const ENV_ID = 'f56a252e-7cb5-49dd-a144-d69b45ec0196'; // production
const GHOST_IMAGE = 'ghost:6.62.0-alpine'; // pinned; a re-pin is a deliberate commit
const MYSQL_IMAGE = 'mysql:8.4'; // pinned
const DOMAIN = 'cms.themodestyhouse.com';
const ZONE = 'themodestyhouse.com';

const token = process.env.RAILWAY_API_KEY;
if (!token) throw new Error('RAILWAY_API_KEY is not set');

async function gql(query, variables = {}) {
  const res = await fetch(RAILWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '));
  return body.data;
}

const secret = () => randomBytes(24).toString('hex');

async function services() {
  const d = await gql(
    `query($id: String!) { project(id: $id) { services { edges { node { id name
       serviceInstances { edges { node { environmentId } } } } } } } }`,
    { id: PROJECT_ID },
  );
  return d.project.services.edges.map((e) => e.node);
}

async function ensureService(name, image, variables) {
  const found = (await services()).find((s) => s.name === name);
  if (found) {
    console.log(`exists   service ${name} (${found.id})`);
    return { id: found.id, created: false };
  }
  const d = await gql(
    `mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id } }`,
    { input: { projectId: PROJECT_ID, environmentId: ENV_ID, name, source: { image }, variables } },
  );
  console.log(`created  service ${name} (${d.serviceCreate.id}) from ${image}`);
  return { id: d.serviceCreate.id, created: true };
}

async function ensureVolume(serviceId, mountPath) {
  const d = await gql(
    `query($id: String!) { environment(id: $id) { volumeInstances { edges { node { serviceId mountPath } } } } }`,
    { id: ENV_ID },
  );
  const has = d.environment.volumeInstances.edges.some(
    (i) => i.node.serviceId === serviceId && i.node.mountPath === mountPath,
  );
  if (has) return console.log(`exists   volume ${mountPath}`);
  await gql(`mutation($input: VolumeCreateInput!) { volumeCreate(input: $input) { id } }`, {
    input: { projectId: PROJECT_ID, environmentId: ENV_ID, serviceId, mountPath },
  });
  console.log(`created  volume ${mountPath}`);
}

// --- mysql
const mysql = await ensureService('mysql', MYSQL_IMAGE, {
  MYSQL_ROOT_PASSWORD: secret(),
  MYSQL_DATABASE: 'ghost',
  MYSQL_USER: 'ghost',
  MYSQL_PASSWORD: secret(),
  // Railway mounts volumes root-owned; both official images drop privileges themselves.
  RAILWAY_RUN_UID: '0',
});
await ensureVolume(mysql.id, '/var/lib/mysql');

// --- ghost. Mail (Mailgun) is deliberately absent: it needs Tina's account.
const ghost = await ensureService('ghost', GHOST_IMAGE, {
  url: `https://${DOMAIN}`,
  NODE_ENV: 'production',
  database__client: 'mysql', // Ghost's documented value; self-normalises to mysql2
  database__connection__host: '${{mysql.RAILWAY_PRIVATE_DOMAIN}}',
  database__connection__port: '3306',
  database__connection__user: '${{mysql.MYSQL_USER}}',
  database__connection__password: '${{mysql.MYSQL_PASSWORD}}',
  database__connection__database: '${{mysql.MYSQL_DATABASE}}',
  RAILWAY_RUN_UID: '0',
});
await ensureVolume(ghost.id, '/var/lib/ghost/content');

await gql(
  `mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
     serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) }`,
  {
    serviceId: ghost.id,
    environmentId: ENV_ID,
    // NO healthcheck, deliberately. Railway probes over plain http with a foreign Host, and
    // Ghost answers that with a 301 to its https `url`, so the deploy sat in DEPLOYING
    // forever (and Railway will not route a custom domain to a deploy that never went
    // healthy). Measured 2026-09-19: with the path set, DEPLOYING for >5 min although
    // Ghost had booted in 20 s; cleared, SUCCESS in 9 s. `null` is silently ignored by the
    // API; only the empty string clears it. Ghost is verified by scripts/ghost-theme.mjs.
    input: { healthcheckPath: '' },
  },
);
console.log('set      ghost healthcheck cleared (Ghost redirects Railway\'s http probe)');

// --- domain
const existing = await gql(
  `query($p: String!, $e: String!, $s: String!) { domains(projectId: $p, environmentId: $e, serviceId: $s) { customDomains { id domain status { verified verificationDnsHost verificationToken dnsRecords { hostlabel recordType requiredValue currentValue status } } } } }`,
  { p: PROJECT_ID, e: ENV_ID, s: ghost.id },
);
let custom = existing.domains.customDomains.find((c) => c.domain === DOMAIN);
if (custom) {
  console.log(`exists   custom domain ${DOMAIN}`);
} else {
  const d = await gql(
    `mutation($input: CustomDomainCreateInput!) { customDomainCreate(input: $input) { id domain status { verified verificationDnsHost verificationToken dnsRecords { hostlabel recordType requiredValue status } } } }`,
    { input: { domain: DOMAIN, environmentId: ENV_ID, projectId: PROJECT_ID, serviceId: ghost.id, targetPort: 2368 } },
  );
  custom = d.customDomainCreate;
  console.log(`created  custom domain ${DOMAIN}`);
}
const verification = custom.status.verified === false && custom.status.verificationDnsHost
  ? { host: `${custom.status.verificationDnsHost}.${ZONE}`, value: custom.status.verificationToken }
  : null;
const cname = custom.status.dnsRecords.find((r) => r.recordType.includes('CNAME'));
if (!cname) throw new Error(`Railway returned no CNAME target: ${JSON.stringify(custom.status.dnsRecords)}`);
console.log(`railway  wants CNAME ${DOMAIN} -> ${cname.requiredValue}`);

// --- Cloudflare: one DNS-ONLY CNAME. The zone's cache rules have no hostname condition and
// were observed caching /ghost at the edge, so the Ghost host must NOT be proxied (grey cloud).
const cfToken = process.env.CLOUDFLARE_API_TOKEN;
if (!cfToken) {
  console.log('SKIPPED  Cloudflare: CLOUDFLARE_API_TOKEN not set; add the CNAME above by hand, DNS only.');
} else {
  const cf = async (path, init) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    });
    const body = await res.json();
    if (!body.success) throw new Error(`Cloudflare ${path}: ${JSON.stringify(body.errors)}`);
    return body.result;
  };
  const zone = (await cf(`/zones?name=${ZONE}`))[0].id;
  const recs = await cf(`/zones/${zone}/dns_records?name=${DOMAIN}`);
  if (recs.length) {
    const r = recs[0];
    const ok = r.type === 'CNAME' && r.content === cname.requiredValue && r.proxied === false;
    console.log(`${ok ? 'exists  ' : 'MISMATCH'} Cloudflare ${r.type} ${r.name} -> ${r.content} proxied=${r.proxied}`);
    if (!ok) process.exit(1);
  } else {
    await cf(`/zones/${zone}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: DOMAIN, content: cname.requiredValue, proxied: false, ttl: 300 }),
    });
    console.log(`created  Cloudflare CNAME ${DOMAIN} -> ${cname.requiredValue} (DNS only)`);
  }
  // Railway will not issue a certificate until it can see this ownership token.
  if (verification) {
    const t = await cf(`/zones/${zone}/dns_records?name=${verification.host}&type=TXT`);
    if (t.length) console.log(`exists   Cloudflare TXT ${verification.host}`);
    else {
      await cf(`/zones/${zone}/dns_records`, {
        method: 'POST',
        body: JSON.stringify({ type: 'TXT', name: verification.host, content: verification.value, ttl: 300 }),
      });
      console.log(`created  Cloudflare TXT ${verification.host} (Railway ownership verification)`);
    }
  }
}
console.log('\ninfra step done');

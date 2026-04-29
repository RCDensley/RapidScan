// Mock data for RapidScan
const PROJECTS = [
  {
    id: 'p1',
    name: 'Atlas Web',
    source: 'github',
    identifier: 'acme-co/atlas-web',
    lastScanned: '2 hours ago',
    openTasks: 12,
    status: 'warning',
  },
  {
    id: 'p2',
    name: 'Orbit API',
    source: 'github',
    identifier: 'acme-co/orbit-api',
    lastScanned: '6 hours ago',
    openTasks: 4,
    status: 'healthy',
  },
  {
    id: 'p3',
    name: 'Lighthouse Service',
    source: 'zip',
    identifier: 'lighthouse-2026-04.zip',
    lastScanned: 'yesterday',
    openTasks: 21,
    status: 'critical',
  },
  {
    id: 'p4',
    name: 'Compass Mobile',
    source: 'local',
    identifier: '/srv/builds/compass',
    lastScanned: '3 days ago',
    openTasks: 7,
    status: 'warning',
  },
];

const CATEGORIES = [
  { id: 'npm',     name: 'npm packages',    icon: 'package' },
  { id: 'azsdk',   name: 'Azure SDKs',      icon: 'cloud' },
  { id: 'ai',      name: 'AI models',       icon: 'cpu' },
  { id: 'tpapi',   name: 'Third-party APIs',icon: 'plug' },
  { id: 'azsvc',   name: 'Azure services',  icon: 'server' },
  { id: 'orphan',  name: 'Orphaned code',   icon: 'archive' },
];

const DEPS = [
  // npm
  { id:'d1', cat:'npm', name:'axios', cur:'0.27.2', latest:'1.7.4', status:'critical', sev:'critical', score:88, refs:[
    {file:'src/api/client.ts', lines:[34, 89]},
    {file:'src/utils/httpClient.ts', lines:[12]},
    {file:'src/auth/session.ts', lines:[58]},
    {file:'src/integrations/stripe.ts', lines:[14]},
  ], chain:['src/index.ts','src/api/client.ts','src/utils/httpClient.ts'], desc:'Major version behind. The 0.x series has known prototype-pollution issues; upgrade to 1.x carries breaking interceptor changes.' },
  { id:'d2', cat:'npm', name:'lodash', cur:'4.17.20', latest:'4.17.21', status:'warning', sev:'medium', score:42, refs:[
    {file:'src/utils/format.ts', lines:[5,22]},
    {file:'src/state/reducers.ts', lines:[88]},
  ], chain:['src/index.ts','src/state/reducers.ts','src/utils/format.ts'], desc:'Patch behind. CVE-2021-23337 is fixed in 4.17.21.' },
  { id:'d3', cat:'npm', name:'react', cur:'18.2.0', latest:'18.3.1', status:'healthy', sev:'low', score:18, refs:[
    {file:'src/main.tsx', lines:[1]},
  ], chain:['src/main.tsx'], desc:'Minor behind. No known issues.' },
  { id:'d4', cat:'npm', name:'date-fns', cur:'2.29.3', latest:'3.6.0', status:'warning', sev:'medium', score:48, refs:[
    {file:'src/utils/dates.ts', lines:[3]},
  ], chain:['src/utils/dates.ts'], desc:'One major behind; tree-shaking improvements available in 3.x.' },
  { id:'d5', cat:'npm', name:'react-router-dom', cur:'6.4.0', latest:'6.26.0', status:'healthy', sev:'low', score:22, refs:[
    {file:'src/router.tsx', lines:[1,8,14]},
  ], chain:['src/router.tsx'], desc:'Many minor versions behind, but no breaking surface for current usage.' },

  // azure SDKs
  { id:'d6', cat:'azsdk', name:'@azure/storage-blob', cur:'12.12.0', latest:'12.24.0', status:'warning', sev:'medium', score:54, refs:[
    {file:'src/storage/blob.ts', lines:[2,18,67]},
  ], chain:['src/api/uploads.ts','src/storage/blob.ts'], desc:'Older minor; recent patches address shared-key auth edge cases.' },
  { id:'d7', cat:'azsdk', name:'@azure/identity', cur:'3.1.3', latest:'4.4.1', status:'critical', sev:'high', score:74, refs:[
    {file:'src/auth/azure.ts', lines:[4,21]},
  ], chain:['src/auth/azure.ts'], desc:'Major behind. ManagedIdentityCredential default changed; affects production tokens.' },
  { id:'d8', cat:'azsdk', name:'@azure/keyvault-secrets', cur:'4.7.0', latest:'4.8.0', status:'healthy', sev:'low', score:14, refs:[
    {file:'src/auth/secrets.ts', lines:[6]},
  ], chain:['src/auth/secrets.ts'], desc:'On the latest minor for the supported channel.' },

  // AI
  { id:'d9', cat:'ai', name:'gpt-4o-mini', cur:'2024-07-18', latest:'gpt-5.4-mini', status:'deprecated', sev:'high', score:78, refs:[
    {file:'src/ai/summarize.ts', lines:[12]},
    {file:'src/ai/classify.ts', lines:[44]},
  ], chain:['src/ai/summarize.ts'], desc:'Vendor sunset announced; gpt-5.4-mini is a drop-in replacement with lower per-token cost.' },
  { id:'d10', cat:'ai', name:'text-embedding-ada-002', cur:'-', latest:'text-embedding-3-small', status:'deprecated', sev:'medium', score:58, refs:[
    {file:'src/ai/embeddings.ts', lines:[8]},
  ], chain:['src/ai/embeddings.ts'], desc:'Legacy embedding model; new model is 5× cheaper and higher quality.' },

  // 3rd party APIs
  { id:'d11', cat:'tpapi', name:'stripe', cur:'2024-04-10', latest:'2026-04-10', status:'warning', sev:'medium', score:46, refs:[
    {file:'src/integrations/stripe.ts', lines:[14, 88]},
  ], chain:['src/integrations/stripe.ts'], desc:'Older API version; review breaking changes for `Charge` schema.' },
  { id:'d12', cat:'tpapi', name:'segment.com/v1', cur:'-', latest:'-', status:'unknown', sev:'low', score:24, refs:[
    {file:'src/analytics/segment.ts', lines:[3]},
  ], chain:['src/analytics/segment.ts'], desc:'No version metadata reported; treat with caution.' },
  { id:'d13', cat:'tpapi', name:'sentry.io', cur:'7.x', latest:'8.x', status:'healthy', sev:'low', score:20, refs:[
    {file:'src/observability/sentry.ts', lines:[2,9]},
  ], chain:['src/observability/sentry.ts'], desc:'Major upgrade available; current version still receiving security patches.' },

  // azure services
  { id:'d14', cat:'azsvc', name:'Azure Functions (consumption)', cur:'-', latest:'-', status:'healthy', sev:'low', score:12, refs:[
    {file:'infra/functions.bicep', lines:[8]},
  ], chain:['infra/functions.bicep'], desc:'Healthy. Cold-start mitigations in place.' },
  { id:'d15', cat:'azsvc', name:'Azure Cosmos DB', cur:'-', latest:'-', status:'warning', sev:'medium', score:52, refs:[
    {file:'src/storage/cosmos.ts', lines:[2, 47]},
  ], chain:['src/storage/cosmos.ts'], desc:'Indexing policy includes wildcards. Consider scoping.' },
  { id:'d16', cat:'azsvc', name:'Azure Service Bus', cur:'-', latest:'-', status:'healthy', sev:'low', score:18, refs:[
    {file:'src/queue/bus.ts', lines:[3]},
  ], chain:['src/queue/bus.ts'], desc:'Healthy.' },

  // orphan
  { id:'d17', cat:'orphan', name:'src/legacy/oldFetcher.ts', cur:'-', latest:'-', status:'info', sev:'low', score:32, refs:[
    {file:'src/legacy/oldFetcher.ts', lines:[1]},
  ], chain:['src/legacy/oldFetcher.ts'], desc:'No imports detected. Safe to remove if not referenced dynamically.' },
  { id:'d18', cat:'orphan', name:'src/utils/momentShim.ts', cur:'-', latest:'-', status:'info', sev:'low', score:28, refs:[
    {file:'src/utils/momentShim.ts', lines:[1]},
  ], chain:['src/utils/momentShim.ts'], desc:'Imports moment which is itself orphaned. Cleanup candidate.' },
];

const TASKS = [
  { id:'t1', title:'Upgrade axios to 1.x', sev:'critical', score:88, status:'open', dep:'axios', cat:'npm packages', file:'src/api/client.ts', time:'2h ago',
    desc:'axios 0.27 has multiple CVEs and is no longer maintained on the 0.x line. Upgrade to 1.7.x. Note that interceptor signatures have changed and `transformRequest` runs in a different order.',
    locations:[{file:'src/api/client.ts', lines:'34–48'}, {file:'src/utils/httpClient.ts', lines:'12–22'}, {file:'src/auth/session.ts', lines:'58'}],
    fix:`// Before\nimport axios from 'axios';\naxios.defaults.transformRequest = [(data) => data];\n\n// After\nimport axios from 'axios';\naxios.interceptors.request.use((config) => {\n  config.transformRequest = [(data) => data];\n  return config;\n});`,
    test:`it('preserves request bodies through interceptor', async () => {\n  const spy = vi.spyOn(http, 'post');\n  await client.post('/users', { name: 'Mira' });\n  expect(spy.mock.calls[0][1]).toEqual({ name: 'Mira' });\n});`,
  },
  { id:'t2', title:'Migrate from gpt-4o-mini to gpt-5.4-mini', sev:'high', score:78, status:'in_progress', dep:'gpt-4o-mini', cat:'AI models', file:'src/ai/summarize.ts', time:'5h ago',
    desc:'OpenAI announced sunset of gpt-4o-mini for July 2026. gpt-5.4-mini is a drop-in replacement with lower cost and improved JSON-mode reliability.',
    locations:[{file:'src/ai/summarize.ts', lines:'12'}, {file:'src/ai/classify.ts', lines:'44'}],
    fix:`// Replace model id\n- model: 'gpt-4o-mini',\n+ model: 'gpt-5.4-mini',`,
    test:`it('summarize returns within 4s', async () => {\n  const t0 = Date.now();\n  await summarize(longDoc);\n  expect(Date.now() - t0).toBeLessThan(4000);\n});`,
  },
  { id:'t3', title:'Update @azure/identity to v4', sev:'high', score:74, status:'open', dep:'@azure/identity', cat:'Azure SDKs', file:'src/auth/azure.ts', time:'1d ago',
    desc:'ManagedIdentityCredential default chain changed in v4; review production token paths.',
    locations:[{file:'src/auth/azure.ts', lines:'4, 21'}],
    fix:`// Pin the credential chain explicitly\nconst credential = new DefaultAzureCredential({\n  managedIdentityClientId: process.env.AZ_MI_CLIENT_ID,\n});`,
    test:`it('uses MI in prod', () => {\n  expect(credential).toBeInstanceOf(ManagedIdentityCredential);\n});`,
  },
  { id:'t4', title:'Replace text-embedding-ada-002', sev:'medium', score:58, status:'open', dep:'text-embedding-ada-002', cat:'AI models', file:'src/ai/embeddings.ts', time:'1d ago',
    desc:'Legacy embedding model; the new text-embedding-3-small is 5× cheaper.',
    locations:[{file:'src/ai/embeddings.ts', lines:'8'}],
    fix:`- model: 'text-embedding-ada-002'\n+ model: 'text-embedding-3-small'`,
    test:`// Re-index after migration\nawait reindexAll();`,
  },
  { id:'t5', title:'Bump @azure/storage-blob minor', sev:'medium', score:54, status:'open', dep:'@azure/storage-blob', cat:'Azure SDKs', file:'src/storage/blob.ts', time:'2d ago',
    desc:'Patch behind by several minors; recent fixes for shared-key auth edge cases.',
    locations:[{file:'src/storage/blob.ts', lines:'2, 18, 67'}],
    fix:`pnpm up @azure/storage-blob@^12.24.0`,
    test:`it('uploads a 10mb blob', async () => { /* ... */ });`,
  },
  { id:'t6', title:'Tighten Cosmos DB indexing policy', sev:'medium', score:52, status:'in_progress', dep:'Azure Cosmos DB', cat:'Azure services', file:'src/storage/cosmos.ts', time:'2d ago',
    desc:'Wildcard indexing on every path produces unnecessary RU consumption.',
    locations:[{file:'src/storage/cosmos.ts', lines:'2, 47'}],
    fix:`indexingPolicy: {\n  includedPaths: [{ path: '/userId/*' }, { path: '/createdAt/*' }],\n  excludedPaths: [{ path: '/*' }],\n}`,
    test:`it('queries by userId stay under 5 RU', async () => {});`,
  },
  { id:'t7', title:'Apply lodash patch (CVE-2021-23337)', sev:'medium', score:42, status:'open', dep:'lodash', cat:'npm packages', file:'src/utils/format.ts', time:'3d ago',
    desc:'lodash 4.17.20 is vulnerable to command injection via _.template.',
    locations:[{file:'src/utils/format.ts', lines:'5, 22'}],
    fix:`pnpm up lodash@^4.17.21`,
    test:`it('format helper still works', () => {});`,
  },
  { id:'t8', title:'Remove orphaned src/legacy/oldFetcher.ts', sev:'low', score:32, status:'open', dep:'src/legacy/oldFetcher.ts', cat:'Orphaned code', file:'src/legacy/oldFetcher.ts', time:'4d ago',
    desc:'No static imports detected. Confirm no dynamic require, then delete.',
    locations:[{file:'src/legacy/oldFetcher.ts', lines:'whole file'}],
    fix:`rm src/legacy/oldFetcher.ts`,
    test:`// Run \`pnpm tsc\` and full test suite after removal.`,
  },
  { id:'t9', title:'Update Stripe API version', sev:'medium', score:46, status:'open', dep:'stripe', cat:'Third-party APIs', file:'src/integrations/stripe.ts', time:'5d ago',
    desc:'Bump pinned API version to 2026-04-10. Review Charge schema changes.',
    locations:[{file:'src/integrations/stripe.ts', lines:'14, 88'}],
    fix:`new Stripe(key, { apiVersion: '2026-04-10' });`,
    test:`it('creates a charge', async () => {});`,
  },
  { id:'t10', title:'Audit segment.com/v1 usage', sev:'low', score:24, status:'open', dep:'segment.com/v1', cat:'Third-party APIs', file:'src/analytics/segment.ts', time:'6d ago',
    desc:'Unknown vendor version. Replace with their current SDK or remove.',
    locations:[{file:'src/analytics/segment.ts', lines:'3'}],
    fix:`// Replace with @segment/analytics-next`,
    test:`// Verify event volume in dashboard.`,
  },
  { id:'t11', title:'Drop momentShim helper', sev:'low', score:28, status:'won_t_fix', dep:'src/utils/momentShim.ts', cat:'Orphaned code', file:'src/utils/momentShim.ts', time:'1w ago',
    desc:'Shim around moment that nothing imports.',
    locations:[{file:'src/utils/momentShim.ts', lines:'whole file'}],
    fix:`rm src/utils/momentShim.ts`,
    test:`// Tsc + tests.`,
  },
  { id:'t12', title:'Confirm React minor bump 18.3.1', sev:'low', score:18, status:'resolved', dep:'react', cat:'npm packages', file:'src/main.tsx', time:'1w ago',
    desc:'Routine update.',
    locations:[{file:'src/main.tsx', lines:'1'}],
    fix:`pnpm up react@^18.3.1 react-dom@^18.3.1`,
    test:`// Smoke test.`,
  },
];

window.RS_DATA = { PROJECTS, CATEGORIES, DEPS, TASKS };

#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { api } from './client.js';
import { parseId } from './parse-id.js';
import {
  FORMAT_RESOURCE_URI,
  PLAN_INSTRUCTIONS,
  PLAN_SPEC,
  PUBLISH_DESCRIPTION,
} from './spec.js';

// NOTE: stdout is reserved for the JSON-RPC protocol. All logging MUST go to
// stderr, or it will corrupt the stream and the client will fail to parse it.

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });
const fail = (err: unknown): ToolResult => ({
  content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
  isError: true,
});

const server = new McpServer(
  { name: 'post-plan', version: '0.1.0' },
  { instructions: PLAN_INSTRUCTIONS },
);

server.registerTool(
  'publish_plan',
  {
    title: 'Publish plan or document',
    description: PUBLISH_DESCRIPTION,
    inputSchema: {
      title: z.string().describe('Short human title for the plan'),
      html: z.string().describe('The plan as semantic HTML (a full document or a bare fragment)'),
      project: z.string().optional().describe('Optional project name to group/filter plans'),
      note: z.string().optional().describe('Optional note describing this initial version'),
    },
  },
  async ({ title, html, project, note }) => {
    try {
      const r = await api.createPlan({ title, html, project, note });
      return ok(
        `Published "${r.title}" → ${r.url} (version ${r.version}). Share this URL with the user.\n\n` +
          JSON.stringify({ id: r.id, url: r.url, version: r.version, project: r.project }, null, 2),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_plan',
  {
    title: 'Get plan',
    description:
      "Fetch a plan or document's original (un-themed) source HTML so you can read, verify, or refine it. " +
      'Accepts a plan id or a full plan URL. To publish a refinement, use update_plan.',
    inputSchema: {
      plan: z.string().describe('Plan id (e.g. k3f9qm2p) or full plan URL'),
      version: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Specific version to fetch; defaults to the current version'),
    },
  },
  async ({ plan, version }) => {
    try {
      const id = parseId(plan);
      const meta = await api.getMeta(id);
      const html = await api.getSource(id, version);
      const header =
        `Plan ${id} — "${meta.title}"${meta.project ? ` [${meta.project}]` : ''}\n` +
        `Current version: ${meta.currentVersion} (of ${meta.versionCount}). ` +
        `Showing version: ${version ?? meta.currentVersion}.\n` +
        `URL: ${meta.url}\n` +
        `To refine: call update_plan with this id and the new HTML.\n\n` +
        `--- BEGIN PLAN HTML ---\n`;
      return ok(`${header}${html}\n--- END PLAN HTML ---`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'list_plans',
  {
    title: 'List plans',
    description: 'List published plans and documents (most recently updated first), optionally filtered by project.',
    inputSchema: {
      project: z.string().optional().describe('Filter by project name'),
      limit: z.number().int().positive().max(100).optional().describe('Max results (default 30)'),
    },
  },
  async ({ project, limit }) => {
    try {
      const r = await api.listPlans({ project, limit: limit ?? 30 });
      if (r.plans.length === 0) return ok('No plans found.');
      const lines = r.plans.map(
        (p) =>
          `• ${p.title} — ${p.url} [${p.project ?? 'no project'}] v${p.currentVersion}, updated ${p.updatedAt}`,
      );
      return ok(`${r.total} plan(s) total; showing ${r.plans.length}:\n${lines.join('\n')}`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'update_plan',
  {
    title: 'Update plan (new version)',
    description:
      'Publish a new version of an existing plan or document — the verify/refine path. Accepts a plan id or ' +
      'full plan URL; the new HTML becomes the current version under the same URL.',
    inputSchema: {
      plan: z.string().describe('Plan id or full plan URL'),
      html: z.string().describe('The new complete plan HTML (becomes the new current version)'),
      note: z.string().optional().describe('Changelog note, e.g. "verified; fixed step 3"'),
      title: z.string().optional().describe('Optional updated title'),
    },
  },
  async ({ plan, html, note, title }) => {
    try {
      const id = parseId(plan);
      const r = await api.addVersion(id, { html, note, title });
      return ok(
        `Updated plan ${id} → now at version ${r.version} (${r.url}). ` +
          `Direct link to this version: ${r.versionUrl}`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerPrompt(
  'plan',
  {
    title: 'Author a post-plan HTML plan',
    description:
      'Load the full post-plan HTML authoring spec + skeleton, write the plan or document, then publish it with publish_plan.',
    argsSchema: {
      task: z.string().optional().describe('What the plan is for'),
      project: z.string().optional().describe('Project name to tag the plan with'),
    },
  },
  ({ task, project }) => {
    const lead = task
      ? `Create an implementation plan or document for: ${task}\n\n`
      : 'Create an implementation plan or document.\n\n';
    const tail = project
      ? `\n\nWhen it's ready, publish it with publish_plan (project: "${project}") and give me the returned URL.`
      : "\n\nWhen it's ready, publish it with publish_plan and give me the returned URL.";
    return {
      messages: [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text: `${lead}${PLAN_SPEC}${tail}` },
        },
      ],
    };
  },
);

server.registerResource(
  'post-plan-format',
  FORMAT_RESOURCE_URI,
  {
    title: 'post-plan HTML format',
    description: 'The post-plan HTML authoring spec and skeleton.',
    mimeType: 'text/markdown',
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'text/markdown', text: PLAN_SPEC }],
  }),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`post-plan MCP server running on stdio (API: ${api.baseUrl})`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

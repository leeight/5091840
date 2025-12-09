/**
 * Agentic Context Engineering (ACE) Framework
 *
 * A TypeScript implementation using Claude Code Agent SDK
 *
 * ACE treats contexts as evolving playbooks that accumulate, refine, and organize
 * strategies through generation, reflection, and curation.
 */

export { ACE } from './ace';
export { Generator } from './generator';
export { Reflector } from './reflector';
export { Curator } from './curator';
export { PlaybookManager } from './playbook';

export type {
  Task,
  Trajectory,
  Insight,
  DeltaUpdate,
  Playbook,
  PlaybookSection,
  Strategy,
  ACEConfig,
  ACEResult,
} from './types';

import { ClaudeAgentRuntime } from './agent-runtime.js';
import type { AgentRuntime } from './types.js';
import type { AgentId } from '@travel/shared';

import { relationshipManagerCharacter } from './characters/relationship-manager.js';
import { synthesizerCharacter } from './characters/synthesizer.js';
import { logisticsCharacter } from './characters/logistics.js';
import { accommodationCharacter } from './characters/accommodation.js';
import { excursionCharacter } from './characters/excursion.js';
import { budgetFinanceCharacter } from './characters/budget-finance.js';
import { securityHealthCharacter } from './characters/security-health.js';
import { locationsIntelCharacter } from './characters/locations-intel.js';
import { conciergeCharacter } from './characters/concierge.js';
import { liveReroutingCharacter } from './characters/live-rerouting.js';
import { emergencyCharacter } from './characters/emergency.js';
import { feedbackClaimsCharacter } from './characters/feedback-claims.js';
import { travelerProfileCharacter } from './characters/traveler-profile.js';

const ALL_CHARACTERS = [
  relationshipManagerCharacter,
  synthesizerCharacter,
  logisticsCharacter,
  accommodationCharacter,
  excursionCharacter,
  budgetFinanceCharacter,
  securityHealthCharacter,
  locationsIntelCharacter,
  conciergeCharacter,
  liveReroutingCharacter,
  emergencyCharacter,
  feedbackClaimsCharacter,
  travelerProfileCharacter,
];

export class AgentRegistry {
  private agents: Map<AgentId, AgentRuntime> = new Map();

  constructor() {
    for (const character of ALL_CHARACTERS) {
      this.agents.set(character.agent_id, new ClaudeAgentRuntime(character));
    }
  }

  get(agentId: AgentId): AgentRuntime {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);
    return agent;
  }

  getAll(): AgentRuntime[] {
    return Array.from(this.agents.values());
  }

  async startAll(): Promise<void> {
    await Promise.all(this.getAll().map(a => a.start()));
    console.log(`[AgentRegistry] All ${this.agents.size} agents started`);
  }

  async stopAll(): Promise<void> {
    await Promise.all(this.getAll().map(a => a.stop()));
    console.log('[AgentRegistry] All agents stopped');
  }

  listAgents(): { id: AgentId; name: string; description: string; mcp_servers: string[] }[] {
    return this.getAll().map(a => ({
      id: a.character.agent_id,
      name: a.character.name,
      description: a.character.description,
      mcp_servers: a.character.mcp_servers,
    }));
  }
}

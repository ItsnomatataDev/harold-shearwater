export type HaroldAccess = "team" | "agent" | "customer";

export interface HaroldModuleDef {
  id: string;
  label: string;
  access: HaroldAccess[];
  /** What this module is, in one line — used to brief Harold. */
  description: string;
  /** What Harold is allowed/expected to help with here. */
  capabilities: string[];
  /** Suggested prompts shown to the user in the assistant drawer. */
  prompts: string[];
}

/**
 * The single source of truth for "what every module is" so Harold can reason
 * about the screen the user is on. New modules (e.g. live availability or
 * booking once the external endpoints land) only need an entry here.
 */
export const HAROLD_MODULES: Record<string, HaroldModuleDef> = {
  // ---- Shared / Team ----
  basecamp: {
    id: "basecamp",
    label: "Basecamp",
    access: ["team"],
    description:
      "The team's daily starting point: schedule, tasks, meetings, announcements and quick actions.",
    capabilities: [
      "Summarize what matters today",
      "Explain a task or announcement",
      "Draft a quick update",
    ],
    prompts: [
      "What should I focus on today?",
      "Summarize today's schedule",
    ],
  },
  crm: {
    id: "crm",
    label: "CRM",
    access: ["team"],
    description:
      "Customer relationship records: contacts, profiles, enquiry history, preferences and linked bookings.",
    capabilities: [
      "Summarize a customer and their history",
      "Extract preferences and contact details from a conversation",
      "Detect enquiry type and sentiment",
      "Suggest a follow-up task or next action",
      "Draft a reply for staff review",
    ],
    prompts: [
      "Summarize this customer",
      "What follow-up does this contact need?",
      "Extract preferences from the latest conversation",
    ],
  },
  deals: {
    id: "deals",
    label: "Deals",
    access: ["team"],
    description: "Sales pipeline: deals, stages, value and ownership.",
    capabilities: [
      "Summarize the pipeline",
      "Highlight stalled or high-value deals",
      "Suggest next steps for a deal",
    ],
    prompts: ["Which deals need attention?", "Summarize this deal"],
  },
  operations: {
    id: "operations",
    label: "Operations",
    access: ["team"],
    description:
      "Operational work: tasks, duties, bookings, incidents and status.",
    capabilities: [
      "Summarize operational status",
      "Explain an incident or task",
      "Suggest task assignment or priority",
    ],
    prompts: ["What's the operational status?", "Summarize open incidents"],
  },
  communication: {
    id: "communication",
    label: "Communication",
    access: ["team"],
    description:
      "Internal and external conversations, meetings, announcements and Harold handovers.",
    capabilities: [
      "Summarize a conversation thread",
      "Draft a response for review",
      "Recommend the right handover domain",
    ],
    prompts: ["Summarize this conversation", "Draft a reply"],
  },
  handovers: {
    id: "handovers",
    label: "Handover Inbox",
    access: ["team"],
    description:
      "AI-to-human handovers waiting for a qualified team member to claim.",
    capabilities: [
      "Summarize the conversation before claiming",
      "Explain why Harold escalated",
      "Draft an opening reply for the guest or agent",
    ],
    prompts: [
      "Summarize this handover before I claim it",
      "Draft an opening message",
    ],
  },
  products: {
    id: "products",
    label: "Products",
    access: ["team", "agent", "customer"],
    description:
      "The experience catalog: products, variants, inclusions and restrictions. Room products represent room TYPES — availability counts are units left per type, not individual room numbers.",
    capabilities: [
      "Explain a product clearly for the audience",
      "Compare products",
      "List inclusions, requirements and restrictions",
      "Report live room type availability when viewing a room product",
      "Clarify that exact room numbers are assigned after confirmation",
    ],
    prompts: [
      "Explain this product for a guest",
      "What's included in this experience?",
      "Is this room type available on my dates?",
    ],
  },
  rates: {
    id: "rates",
    label: "Rate Plans",
    access: ["team", "agent"],
    description:
      "Pricing: public, agent and agency-specific rate plans. Synced from the integration API.",
    capabilities: [
      "Explain rate conditions and validity",
      "Clarify which rate applies in context",
    ],
    prompts: ["Explain this rate plan", "Which conditions apply?"],
  },
  knowledge: {
    id: "knowledge",
    label: "Knowledge Base",
    access: ["team"],
    description:
      "Policies, SOPs, product fact sheets, media and searchable guidance.",
    capabilities: [
      "Answer from approved company knowledge",
      "Summarize a policy or SOP",
    ],
    prompts: ["What does this policy say?", "Summarize this document"],
  },
  insights: {
    id: "insights",
    label: "Reports & Insights",
    access: ["team"],
    description: "Operational, service, attendance, booking and CRM reporting.",
    capabilities: [
      "Explain a trend or metric",
      "Highlight exceptions worth attention",
    ],
    prompts: ["Explain this report", "What stands out here?"],
  },
  meetings: {
    id: "meetings",
    label: "Meetings",
    access: ["team"],
    description: "Meeting scheduling, attendees, notes and action points.",
    capabilities: [
      "Summarize a meeting",
      "Extract action points",
      "Draft meeting notes",
    ],
    prompts: ["Summarize this meeting", "List the action points"],
  },
  schedules: {
    id: "schedules",
    label: "Duties & Schedules",
    access: ["team"],
    description: "Personal and team duties, rosters and schedules.",
    capabilities: ["Explain a schedule", "Highlight conflicts or gaps"],
    prompts: ["What's on my schedule?", "Any scheduling conflicts?"],
  },
  attendance: {
    id: "attendance",
    label: "Attendance",
    access: ["team"],
    description: "Staff attendance and presence.",
    capabilities: ["Summarize attendance", "Highlight absences"],
    prompts: ["Summarize today's attendance"],
  },
  crew: {
    id: "crew",
    label: "Crew",
    access: ["team"],
    description:
      "Company directory: organizations, departments, teams, employees, roles and locations.",
    capabilities: [
      "Find who owns a responsibility",
      "Explain a role or department",
    ],
    prompts: ["Who handles reservations?", "Explain this role"],
  },
  documents: {
    id: "documents",
    label: "Documents",
    access: ["team", "agent", "customer"],
    description:
      "Secure documents: vouchers, confirmations, itineraries, contracts and fact sheets.",
    capabilities: [
      "Explain a document in plain language",
      "Summarize what a voucher or itinerary contains",
    ],
    prompts: ["Explain this document", "What does this voucher cover?"],
  },
  notifications: {
    id: "notifications",
    label: "Notifications",
    access: ["team", "agent", "customer"],
    description: "Operational and conversational notifications.",
    capabilities: ["Summarize recent notifications", "Explain a notification"],
    prompts: ["Summarize my notifications"],
  },
  settings: {
    id: "settings",
    label: "Settings",
    access: ["team", "agent", "customer"],
    description:
      "Profile, preferences, access rules, integrations and notification settings.",
    capabilities: ["Explain a setting", "Guide a configuration change"],
    prompts: ["How do I change this setting?"],
  },

  // ---- Agent ----
  agent_dashboard: {
    id: "agent_dashboard",
    label: "Agent Dashboard",
    access: ["agent"],
    description:
      "The agency's home: enquiries, bookings, products and quick actions.",
    capabilities: [
      "Summarize the agency's activity",
      "Point to the right next action",
    ],
    prompts: ["What needs my attention?", "Summarize my enquiries"],
  },
  enquiries: {
    id: "enquiries",
    label: "Enquiries",
    access: ["agent"],
    description:
      "Agent enquiries, quotes, provisional reservations and confirmed bookings.",
    capabilities: [
      "Summarize an enquiry",
      "Help prepare a quotation (no confirmation)",
      "Explain booking readiness",
    ],
    prompts: ["Summarize this enquiry", "Help me prepare a quote"],
  },
  search: {
    id: "search",
    label: "Availability",
    access: ["agent"],
    description:
      "Live room TYPE availability — counts show units left per category (Standard Twin, Deluxe Double, etc.), not individual room numbers.",
    capabilities: [
      "Report how many units are left in each room type on a date",
      "Explain which room types are fully booked",
      "Clarify that exact room numbers are assigned after Shearwater confirms the booking",
      "Help compare room type products",
    ],
    prompts: [
      "How many Deluxe Double units are free tomorrow?",
      "Which room types are available on 2026-07-05?",
      "Can you guarantee Room 204?",
    ],
  },
  availability: {
    id: "availability",
    label: "Availability",
    access: ["agent"],
    description:
      "Live room TYPE availability — counts show units left per category (Standard Twin, Deluxe Double, etc.), not individual room numbers.",
    capabilities: [
      "Report how many units are left in each room type on a date",
      "Explain which room types are fully booked",
      "Clarify that exact room numbers are assigned after Shearwater confirms the booking",
      "Help compare room type products",
    ],
    prompts: [
      "How many Deluxe Double units are free tomorrow?",
      "Which room types are available on 2026-07-05?",
      "Can you guarantee Room 204?",
    ],
  },

  // ---- Customer ----
  customer_home: {
    id: "customer_home",
    label: "Guest Home",
    access: ["customer"],
    description:
      "The guest's home: upcoming trips, quick actions and Harold support.",
    capabilities: [
      "Welcome and orient the guest",
      "Point to bookings, documents or explore",
    ],
    prompts: ["What can I do here?", "Help me plan my trip"],
  },
  bookings: {
    id: "bookings",
    label: "Bookings",
    access: ["customer"],
    description:
      "The guest's trips: imported and direct bookings, status and preparation.",
    capabilities: [
      "Summarize a booking",
      "Explain preparation and what to bring",
      "Explain a permitted change request (no confirmation)",
    ],
    prompts: [
      "What do I need to prepare?",
      "Summarize my booking",
    ],
  },
  explore: {
    id: "explore",
    label: "Explore",
    access: ["customer"],
    description:
      "Guest-facing discovery of Shearwater experiences and live room TYPE availability from the synced catalog.",
    capabilities: [
      "Recommend experiences from approved products",
      "Explain inclusions and suitability",
      "Report how many units are left in each room type on a date",
      "Explain that exact room numbers are assigned at confirmation — never invent room numbers",
    ],
    prompts: [
      "How many Dome Tent units are available this weekend?",
      "Which room types are free on 2026-07-01?",
      "What experiences suit families?",
    ],
  },
  profile: {
    id: "profile",
    label: "Profile & Party",
    access: ["customer"],
    description: "Guest contact details, preferences and travel party.",
    capabilities: [
      "Explain what details are needed and why",
      "Help complete the profile",
    ],
    prompts: ["What details should I add?"],
  },
  messages: {
    id: "messages",
    label: "Messages",
    access: ["customer"],
    description:
      "Human chat with Shearwater after Harold hands the conversation over.",
    capabilities: ["Recap the conversation", "Help phrase a question"],
    prompts: ["Recap my conversation"],
  },
};

export function getHaroldModule(id: string | null | undefined) {
  if (!id) return null;
  if (id === "search") return HAROLD_MODULES.availability;
  return HAROLD_MODULES[id] ?? null;
}

export function listHaroldModules(access: HaroldAccess) {
  return Object.values(HAROLD_MODULES).filter((module) =>
    module.access.includes(access),
  );
}

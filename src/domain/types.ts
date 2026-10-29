// Domain model. Three layers: design system (tokens), component library, journeys.
// The same component exists at three levels, kept distinct on purpose:
//   ComponentDef      the design of a component (variants, props, tokens it uses)
//   ComponentInstance one use of that component inside a screen (chosen variant, prop values)
//   JourneyNode       the role of a screen inside a journey (step, links, conditions, insights)

export type Id = string;

export interface Workspace {
  id: Id;
  name: string;
  industry: string;
  brandSource: string;
  createdAt: string;
}

export type TokenType = 'color' | 'fontFamily' | 'fontWeight' | 'fontSize' | 'dimension' | 'radius' | 'shadow' | 'duration' | 'easing';

export type TokenTier = 'primitive' | 'semantic';

export type TokenProvenance = 'brand' | 'derived' | 'functional' | 'todo-brand';

export interface DesignToken {
  id: Id;
  /** Dotted name, for example color.action.primary */
  name: string;
  type: TokenType;
  tier: TokenTier;
  category: string;
  /** Raw value for primitives; for semantic tokens, a `{token.name}` reference. */
  value: string;
  description?: string;
  provenance: TokenProvenance;
  source?: string;
}

export interface DesignPrinciple {
  id: Id;
  title: string;
  description: string;
}

export type ComponentCategory = 'Actions' | 'Forms' | 'Feedback' | 'Navigation' | 'Content' | 'Layout';

export type PropKind = 'text' | 'boolean' | 'select' | 'number';

export interface PropDef {
  name: string;
  label: string;
  kind: PropKind;
  options?: string[];
  defaultValue: string | boolean | number;
  /** Shown in the inspector only when "Show advanced" is on. */
  advanced?: boolean;
}

export interface ComponentVariant {
  id: Id;
  name: string;
  description?: string;
}

export type ComponentStatus = 'stable' | 'beta' | 'deprecated';

export interface ComponentDef {
  id: Id;
  /** Renderer key; one renderer per component kind. */
  kind: ComponentKind;
  name: string;
  category: ComponentCategory;
  status: ComponentStatus;
  description: string;
  variants: ComponentVariant[];
  sizes: string[];
  states: string[];
  props: PropDef[];
  /** Names of the tokens this component consumes. */
  tokens: string[];
  guidelines: { do: string[]; dont: string[] };
  /** Interaction behaviours the component can trigger in a journey. */
  interactions: InteractionKind[];
  provenance?: ComponentProvenance;
  /** Accessibility rules carried by the component (from the bench arbitration and WCAG 2.2 AA). */
  a11y?: string[];
}

export type ComponentKind =
  | 'button'
  | 'textInput'
  | 'formField'
  | 'errorMessage'
  | 'progress'
  | 'codeInput'
  | 'confirmation'
  | 'heading'
  | 'text'
  | 'checkbox'
  | 'link'
  | 'alert'
  | 'card'
  | 'divider'
  | 'navBar'
  | 'siteHeader'
  | 'siteFooter'
  | 'tabs'
  | 'accordion'
  | 'tag'
  | 'emptyState'
  | 'breadcrumbs'
  | 'hero'
  | 'ctaBand'
  | 'stat'
  | 'testimonial'
  | 'select'
  | 'textarea';

/** Where a catalog entry comes from. Bench entries trace back to the DS-Devo benchmark arbitration. */
export interface ComponentProvenance {
  source: 'core' | 'bench-01';
  /** Founder decision or backlog row in DS-Devo, for example "S-017, D-B13". */
  ref?: string;
  /** What the benchmark contributed, paraphrased. */
  note?: string;
}

export type InteractionKind = 'navigate' | 'submit' | 'back' | 'none';

export interface ComponentInstance {
  id: Id;
  componentId: Id;
  variantId: Id;
  size?: string;
  state?: string;
  props: Record<string, string | boolean | number>;
  interaction?: { kind: InteractionKind; label?: string };
}

export type InsightKind = 'pain-point' | 'need' | 'observation' | 'opportunity';

export interface Insight {
  id: Id;
  kind: InsightKind;
  title: string;
  detail: string;
  source: string;
  evidence: 'low' | 'medium' | 'high';
  useCaseIds: Id[];
}

export interface UseCase {
  id: Id;
  title: string;
  actor: string;
  goal: string;
  outcome: string;
  businessObjective: string;
  audience: string;
  context: string;
  metric: string;
}

export type NodeKind = 'start' | 'screen' | 'decision' | 'outcome';

export type OutcomeTone = 'success' | 'failure' | 'neutral';

export interface DesignDecision {
  id: Id;
  text: string;
  insightIds: Id[];
}

export interface JourneyNode {
  id: Id;
  kind: NodeKind;
  title: string;
  description: string;
  position: { x: number; y: number };
  /** Screen nodes only. */
  components: ComponentInstance[];
  /** Decision nodes only: the question being evaluated. */
  question?: string;
  /** Outcome nodes only. */
  tone?: OutcomeTone;
  insightIds: Id[];
  decisions: DesignDecision[];
  notes?: string;
}

export interface JourneyEdge {
  id: Id;
  source: Id;
  target: Id;
  /** Label shown on the canvas and as the choice in preview. */
  label: string;
  /** Free-text branching rule, for example `email is invalid`. */
  condition?: string;
  /** Alternative paths are drawn dashed. */
  kind: 'main' | 'alternative';
  /** Which component instance in the source screen triggers this edge, if any. */
  triggerInstanceId?: Id;
}

export type JourneyStatus = 'draft' | 'in-review' | 'validated';

export interface Journey {
  id: Id;
  name: string;
  useCaseId: Id | null;
  status: JourneyStatus;
  folder: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  updatedAt: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: Id;
  at: string;
  text: string;
  target?: { kind: 'journey' | 'component' | 'token' | 'insight' | 'useCase'; id: Id };
}

export interface PlatformData {
  workspace: Workspace;
  tokens: DesignToken[];
  principles: DesignPrinciple[];
  components: ComponentDef[];
  useCases: UseCase[];
  insights: Insight[];
  journeys: Journey[];
  activity: ActivityEntry[];
}

export type MasterEntry = {
  id: string; batchId: string; kind: string; resourceType: string; sourceId: string; code: string; name: string;
  unit: string | null; sourceContext: string; status: string; issues: string[]; revision: number; reviewState: string;
  data?: Record<string, unknown>;
}
export type CatalogPrice = { amount: string; currency: string; denomination: string; baseDate: string; validUntil: string; costBasis: string; evidence: string }
export type CatalogComponent = { resourceType: string; resourceSourceId: string; code: string; quantity: string; wastePct: string | null; sourceDepreciation: string | null }
export type CatalogDraft = {
  name: string; unit: string | null; familySourceId: string | null; price: CatalogPrice | null;
  yieldValue: string | null; yieldBasis: string | null; hoursPerDay: string | null; methodNote: string; composition: CatalogComponent[];
}
export type CatalogReview = {
  original: MasterEntry; revision: number; state: string; draft: CatalogDraft; blockers: string[];
  dependencies: { id: string | null; sourceId: string; resourceType: string; code: string; name: string; kind: string; revision: number; state: string }[];
}
export type CatalogRelease = { id: string; name: string; version: number; state: string; contentHash: string; entryCount: number; usage: string; createdAt: string; publishedAt: string | null }
export const MASTER_KINDS: Record<string, string> = { FAMILY: 'Familia', RESOURCE: 'Insumo', ITEM: 'Partida', APU: 'APU' }
export const RESOURCE_TYPES: Record<string, string> = { MATERIAL: 'Material', EQUIPMENT: 'Equipo', LABOR: 'Mano de obra' }
export const selectClass = 'h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm'

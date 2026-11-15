/**
 * The single data entry point for the interface.
 *
 * Components import data only from `@/lib/data`, never from the individual
 * modules or the JSON snapshots. Swapping the demonstration snapshot for a
 * live API means changing these selectors, not the screens.
 */
export * from "./vitals";
export * from "./metrics";
export * from "./subjects";
export * from "./mission";
export * from "./bodySystems";
export * from "./assessments";
export * from "./hazards";
export { CAREER_LIMIT_MSV } from "./reference";

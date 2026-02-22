const instanceCounts = new Map<string, number>();

/**
 * Creates a function that generates HTML element IDs namespaced to a specific
 * component instance. Each call increments a per-component counter so that
 * multiple instances of the same component produce unique IDs.
 *
 * @param componentName - A name identifying the component type.
 * @returns A function that accepts a local identifier and returns a namespaced ID string.
 *
 * @example
 * ```ts
 * const nsId = createNsId("AcademyTicket");
 * nsId("acceptTos"); // "AcademyTicket-0-acceptTos"
 *
 * // Second instance of the same component:
 * const nsId2 = createNsId("AcademyTicket");
 * nsId2("acceptTos"); // "AcademyTicket-1-acceptTos"
 * ```
 */
export function createNsId(componentName: string): (id: string) => string {
  const instance = instanceCounts.get(componentName) ?? 0;
  instanceCounts.set(componentName, instance + 1);
  return (id: string) => `${componentName}-${instance}-${id}`;
}

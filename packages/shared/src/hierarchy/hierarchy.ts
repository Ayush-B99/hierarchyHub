/**
 * Helpers for working with the reporting hierarchy. Each employee points at
 * their manager (adjacency list), so the tree is built from a flat list.
 */

interface Node {
  id: string;
  managerId: string | null;
}

export interface TreeNode<T> {
  data: T;
  children: TreeNode<T>[];
}

/** Builds one or more trees from a flat list in O(n). People whose manager is missing become roots. */
export function buildForest<T extends Node>(items: readonly T[]): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>();
  for (const item of items) nodes.set(item.id, { data: item, children: [] });

  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.data.managerId ? nodes.get(node.data.managerId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/**
 * True when making `candidateManagerId` the manager of `employeeId` would break
 * the rules: the employee would manage themselves (BR-01) or create a loop (BR-02).
 */
export function wouldCreateCycle(
  employeeId: string,
  candidateManagerId: string | null,
  managerOf: (id: string) => string | null | undefined,
): boolean {
  let current = candidateManagerId;
  const seen = new Set<string>();
  while (current) {
    if (current === employeeId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = managerOf(current) ?? null;
  }
  return false;
}

/** The chain from the top of the organisation down to (and including) this employee. */
export function chainToTop<T extends Node>(id: string, byId: ReadonlyMap<string, T>): T[] {
  const chain: T[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = current.managerId ? byId.get(current.managerId) : undefined;
  }
  return chain;
}

/** Everyone below this employee, at any depth. */
export function descendantsOf<T extends Node>(id: string, items: readonly T[]): T[] {
  const result: T[] = [];
  const queue = [id];
  const seen = new Set<string>([id]);
  while (queue.length) {
    const current = queue.shift() as string;
    for (const item of items) {
      if (item.managerId === current && !seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
        queue.push(item.id);
      }
    }
  }
  return result;
}

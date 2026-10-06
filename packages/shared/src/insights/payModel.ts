export interface PayPerson {
  id: string;
  managerId: string | null;
  salary: number | null;
}

export interface PayModel {
  weights: number[];
  trainedOn: number;
  typicalError: number;
}

export interface PayFlag {
  employeeId: string;
  salary: number;
  expected: number;
  difference: number;
}

export const MIN_TRAINING_SIZE = 5;
export const FLAG_THRESHOLD = 0.25;

export function teamSizes(people: readonly PayPerson[]): Map<string, number> {
  const managerOf = new Map(people.map((p) => [p.id, p.managerId]));
  const sizes = new Map(people.map((p) => [p.id, 0]));

  for (const person of people) {
    const seen = new Set<string>();
    let manager = person.managerId;
    while (manager !== null && sizes.has(manager) && !seen.has(manager)) {
      seen.add(manager);
      sizes.set(manager, (sizes.get(manager) ?? 0) + 1);
      manager = managerOf.get(manager) ?? null;
    }
  }
  return sizes;
}

export function featuresFor(teamSize: number): number[] {
  return [1, Math.log2(1 + teamSize), teamSize > 0 ? 1 : 0];
}

const dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);

export function solve(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i] ?? 0]);

  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row]![col]!) > Math.abs(a[best]![col]!)) best = row;
    }
    if (Math.abs(a[best]![col]!) < 1e-9) return null;
    [a[col], a[best]] = [a[best]!, a[col]!];

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row]![col]! / a[col]![col]!;
      for (let k = col; k <= n; k++) a[row]![k]! -= factor * a[col]![k]!;
    }
  }
  return a.map((row, i) => row[n]! / row[i]!);
}

export function leastSquares(rows: number[][], targets: number[]): number[] | null {
  const size = rows[0]?.length ?? 0;
  const xtx = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => rows.reduce((sum, r) => sum + r[i]! * r[j]!, 0)),
  );
  const xty = Array.from({ length: size }, (_, i) =>
    rows.reduce((sum, r, k) => sum + r[i]! * targets[k]!, 0),
  );
  return solve(xtx, xty);
}

export function trainPayModel(people: readonly PayPerson[]): PayModel | null {
  const sizes = teamSizes(people);
  const known = people.filter((p): p is PayPerson & { salary: number } => p.salary !== null);
  if (known.length < MIN_TRAINING_SIZE) return null;

  const targets = known.map((p) => p.salary);
  const allFeatures = known.map((p) => featuresFor(sizes.get(p.id) ?? 0));

  for (let count = allFeatures[0]!.length; count >= 1; count--) {
    const rows = allFeatures.map((features) => features.slice(0, count));
    const weights = leastSquares(rows, targets);
    if (!weights) continue;

    const squaredErrors = rows.map((row, i) => (dot(row, weights) - targets[i]!) ** 2);
    const typicalError = Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / rows.length);
    return { weights, trainedOn: known.length, typicalError };
  }
  return null;
}

export function expectedSalary(model: PayModel, teamSize: number): number {
  const features = featuresFor(teamSize).slice(0, model.weights.length);
  return dot(features, model.weights);
}

export function salaryRange(model: PayModel, teamSize: number): { low: number; high: number } {
  const expected = expectedSalary(model, teamSize);
  const round = (value: number) => Math.max(0, Math.round(value / 1000) * 1000);
  return { low: round(expected - model.typicalError), high: round(expected + model.typicalError) };
}

export function payFlags(
  people: readonly PayPerson[],
  model: PayModel,
  threshold = FLAG_THRESHOLD,
): PayFlag[] {
  const sizes = teamSizes(people);
  const flags: PayFlag[] = [];

  for (const person of people) {
    if (person.salary === null) continue;
    const expected = expectedSalary(model, sizes.get(person.id) ?? 0);
    if (expected <= 0) continue;

    const difference = (person.salary - expected) / expected;
    if (Math.abs(difference) > threshold) {
      flags.push({ employeeId: person.id, salary: person.salary, expected, difference });
    }
  }
  return flags.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

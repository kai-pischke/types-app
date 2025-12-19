import type { Pattern, JudgmentInstance, Term, InferenceRule, Constructor } from '../../types/syntax';

// Check if a pattern is complete (has no empty placeholders)
export function isPatternComplete(pattern: Pattern): boolean {
  if (!pattern.constructorId && !pattern.metaVariableId) {
    return false;
  }
  return pattern.args.every(isPatternComplete);
}

// Check if a judgment instance is complete
export function isJudgmentInstanceComplete(instance: JudgmentInstance): boolean {
  return instance.args.every(isPatternComplete);
}

// Check if an entire rule is complete
export function isRuleComplete(rule: InferenceRule): boolean {
  const conclusionComplete = isJudgmentInstanceComplete(rule.conclusion);
  const premisesComplete = rule.premises.every(isJudgmentInstanceComplete);
  return conclusionComplete && premisesComplete;
}

// Check if a term is complete (no null placeholders)
export function isTermComplete(term: Term | null): boolean {
  if (!term) return false;
  return term.args.every(arg => isTermComplete(arg));
}

// Compare two terms structurally (ignoring unique IDs)
export function termsEqual(t1: Term, t2: Term): boolean {
  // Handle atom terms
  if (t1.isVariable || t2.isVariable) {
    return t1.isVariable === t2.isVariable && t1.variableName === t2.variableName;
  }
  if (t1.constructorId !== t2.constructorId) return false;
  if (t1.args.length !== t2.args.length) return false;
  return t1.args.every((arg, i) => termsEqual(arg, t2.args[i]));
}

// Check if a term matches a pattern (returns bindings or null)
export function matchPattern(term: Term, pattern: Pattern): Map<string, Term> | null {
  if (pattern.metaVariableId) {
    const bindings = new Map<string, Term>();
    bindings.set(pattern.metaVariableId, term);
    return bindings;
  }
  
  if (pattern.constructorId) {
    // Atom terms don't have a constructorId
    if (term.isVariable) return null;
    if (term.constructorId !== pattern.constructorId) return null;
    if (term.args.length !== pattern.args.length) return null;
    
    const allBindings = new Map<string, Term>();
    for (let i = 0; i < pattern.args.length; i++) {
      const argBindings = matchPattern(term.args[i], pattern.args[i]);
      if (!argBindings) return null;
      for (const [key, value] of argBindings) {
        if (allBindings.has(key)) {
          const existing = allBindings.get(key)!;
          if (!termsEqual(existing, value)) return null;
        }
        allBindings.set(key, value);
      }
    }
    return allBindings;
  }
  
  return null;
}

// Substitute meta-variables in a pattern to get a term
export function substitutePattern(pattern: Pattern, bindings: Map<string, Term>): Term | null {
  if (pattern.metaVariableId) {
    return bindings.get(pattern.metaVariableId) || null;
  }
  if (pattern.constructorId) {
    const args: Term[] = [];
    for (const argPattern of pattern.args) {
      const argTerm = substitutePattern(argPattern, bindings);
      if (!argTerm) return null;
      args.push(argTerm);
    }
    return {
      id: crypto.randomUUID(),
      constructorId: pattern.constructorId,
      args,
    };
  }
  return null;
}

// Render a term as a string
export function renderTermString(
  term: Term,
  constructors: Map<string, Constructor>
): string {
  // Handle atom terms
  if (term.isVariable && term.variableName) {
    return term.variableName;
  }
  
  const constructor = constructors.get(term.constructorId);
  if (!constructor) return '?';
  
  if (term.args.length === 0) {
    return constructor.name;
  }
  return `${constructor.name}(${term.args.map(arg => renderTermString(arg, constructors)).join(', ')})`;
}



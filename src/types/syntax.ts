import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Core Syntax Types
// ============================================================================

export type SortId = string;
export type ConstructorId = string;
export type VariableName = string;

/**
 * Sort kinds:
 * - 'inductive': Normal sorts defined by constructors (e.g., N := Zero | Succ N)
 * - 'atom': Infinite sets of atoms/names (e.g., variables x, y, z or participants p, q)
 */
export type SortKind = 'inductive' | 'atom';

/**
 * A syntactic sort (e.g., N, Tree, Expr, Type, Var, Participant)
 */
export type Sort = {
  id: SortId;
  name: string;
  description?: string;
  kind: SortKind; // 'inductive' for normal sorts, 'atom' for infinite name sets
  isBinderSort: boolean; // For atom sorts: whether these atoms can be bound
  color: string; // For visual distinction
  // For atom sorts only:
  atomPrefix?: string; // Prefix for generating names (e.g., "x" → x₁, x₂)
};

/**
 * A constructor argument - can be a recursive reference to a sort
 * or a binder introduction
 */
export type ConstructorArg = {
  id: string;
  sortId: SortId;
  label?: string; // Optional label for display
  isBinder?: boolean; // If true, this introduces a binding
  bindsIn?: string[]; // IDs of args where this binder is in scope
};

/**
 * A constructor in a sort definition
 * e.g., Zero, Succ(n: N), Leaf, Branch(left: Tree, right: Tree)
 */
export type Constructor = {
  id: ConstructorId;
  sortId: SortId;
  name: string;
  args: ConstructorArg[];
  isTerminal: boolean; // No recursive arguments
};

/**
 * A concrete term (instance of a sort)
 */
export type Term = {
  id: string;
  constructorId: ConstructorId;
  args: Term[];
  // For variable references
  variableName?: VariableName;
  isVariable?: boolean;
};

// ============================================================================
// Inference Rule Types
// ============================================================================

export type RuleId = string;
export type JudgmentId = string;

/**
 * A meta-variable in a rule (stands for any term of a given sort)
 */
export type MetaVariable = {
  id: string;
  name: string;
  sortId: SortId;
};

/**
 * A pattern that matches terms - can include meta-variables
 */
export type Pattern = {
  id: string;
  constructorId?: ConstructorId; // undefined for meta-variable patterns
  metaVariableId?: string; // If this is just a meta-variable
  args: Pattern[];
};

/**
 * A judgment in the relation (e.g., "n ↓ m" or "Γ ⊢ e : τ")
 * 
 * The `separators` array defines what appears between arguments:
 * - separators[0] appears BEFORE arg[0] (prefix)
 * - separators[i] appears AFTER arg[i-1] and BEFORE arg[i]
 * - separators[n] appears AFTER arg[n-1] (suffix)
 * 
 * Examples:
 * - 1-arg "e val": separators = ["", " val"]
 * - 2-arg "e ↓ v": separators = ["", " ↓ ", ""]
 * - 3-arg "Γ ⊢ e : τ": separators = ["", " ⊢ ", " : ", ""]
 */
export type Judgment = {
  id: JudgmentId;
  name: string;
  symbol: string; // Main symbol for display (legacy, still used for quick reference)
  separators: string[]; // Flexible separators: length = argSorts.length + 1
  argSorts: { sortId: SortId; label: string }[];
  color: string;
};

/**
 * A premise or conclusion in a rule
 */
export type JudgmentInstance = {
  id: string;
  judgmentId: JudgmentId;
  args: Pattern[];
};

/**
 * An inference rule
 */
/**
 * A side condition in a rule (using function predicates)
 */
export type SideCondition = {
  id: string;
  predicate: RuleFuncPredicate;
};

/**
 * Function predicates for use in rule side conditions
 */
export type RuleFuncPredicate =
  | { kind: 'eq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }       // f(p) = e
  | { kind: 'neq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }      // f(p) ≠ e
  | { kind: 'lt'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }       // f(p) < e
  | { kind: 'leq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }      // f(p) ≤ e
  | { kind: 'gt'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }       // f(p) > e
  | { kind: 'geq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }      // f(p) ≥ e
  | { kind: 'isEmpty'; funcId: RecFuncId; arg: Pattern }                   // f(p) = ∅
  | { kind: 'notEmpty'; funcId: RecFuncId; arg: Pattern }                  // f(p) ≠ ∅
  | { kind: 'in'; element: Pattern; funcId: RecFuncId; arg: Pattern }      // x ∈ f(p)
  | { kind: 'notIn'; element: Pattern; funcId: RecFuncId; arg: Pattern };  // x ∉ f(p)

export type InferenceRule = {
  id: RuleId;
  name: string;
  premises: JudgmentInstance[];
  sideConditions: SideCondition[];  // Function-based side conditions
  conclusion: JudgmentInstance;
  // Position for drag-and-drop
  position: { x: number; y: number };
};

// ============================================================================
// Derivation Trees
// ============================================================================

/**
 * A derivation tree showing how a judgment is derived
 */
export type Derivation = {
  ruleName: string;
  ruleId: RuleId;
  conclusion: { judgmentId: JudgmentId; terms: Term[] };
  premises: Derivation[];
};

// ============================================================================
// Syntax-Directed Analysis
// ============================================================================

export type RulePattern = {
  ruleId: RuleId;
  constructorPattern: ConstructorId | null; // null for variable patterns
  argPatterns: (ConstructorId | null)[];
};

export type OverlapInfo = {
  rule1Id: RuleId;
  rule2Id: RuleId;
  overlappingPosition: number;
  description: string;
};

export type SyntaxDirectedAnalysis = {
  isSyntaxDirected: boolean;
  overlaps: OverlapInfo[];
};

// ============================================================================
// Proof Assistant - First-Order Logic Properties
// ============================================================================

export type PropertyId = string;
export type ProofId = string;
export type GoalId = string;

/**
 * Expressions in formulas (terms with variables)
 */
export type FormulaExpr =
  | { kind: 'var'; name: string }
  | { kind: 'constructor'; constructorId: ConstructorId; args: FormulaExpr[] }
  | { kind: 'funcApp'; funcId: RecFuncId; arg: FormulaExpr }  // f(e)
  | { kind: 'int'; value: number }
  | { kind: 'emptySet' }
  | { kind: 'add'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'sub'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'mul'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'max'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'min'; left: FormulaExpr; right: FormulaExpr };

/**
 * First-order formulas
 */
export type Formula =
  // Quantifiers
  | { kind: 'forall'; varName: string; sortId: SortId; body: Formula }
  | { kind: 'exists'; varName: string; sortId: SortId; body: Formula }
  // Connectives
  | { kind: 'implies'; left: Formula; right: Formula }
  | { kind: 'and'; left: Formula; right: Formula }
  | { kind: 'or'; left: Formula; right: Formula }
  | { kind: 'not'; body: Formula }
  // Predicates
  | { kind: 'judgment'; judgmentId: JudgmentId; args: FormulaExpr[] }  // e.g., n even
  | { kind: 'termEq'; left: FormulaExpr; right: FormulaExpr }         // t₁ = t₂
  | { kind: 'termNeq'; left: FormulaExpr; right: FormulaExpr }        // t₁ ≠ t₂
  // Function predicates (legacy - single function to value)
  | { kind: 'funcEq'; funcId: RecFuncId; arg: FormulaExpr; value: FormulaExpr }    // f(t) = v
  | { kind: 'funcLeq'; funcId: RecFuncId; arg: FormulaExpr; value: FormulaExpr }   // f(t) ≤ v
  | { kind: 'funcLt'; funcId: RecFuncId; arg: FormulaExpr; value: FormulaExpr }    // f(t) < v
  // Numeric comparisons (between expressions)
  | { kind: 'numEq'; left: FormulaExpr; right: FormulaExpr }          // e₁ = e₂
  | { kind: 'numNeq'; left: FormulaExpr; right: FormulaExpr }         // e₁ ≠ e₂
  | { kind: 'numLeq'; left: FormulaExpr; right: FormulaExpr }         // e₁ ≤ e₂
  | { kind: 'numLt'; left: FormulaExpr; right: FormulaExpr }          // e₁ < e₂
  | { kind: 'numGeq'; left: FormulaExpr; right: FormulaExpr }         // e₁ ≥ e₂
  | { kind: 'numGt'; left: FormulaExpr; right: FormulaExpr }          // e₁ > e₂
  // Set predicates
  | { kind: 'setEmpty'; funcId: RecFuncId; arg: FormulaExpr }         // f(t) = ∅
  | { kind: 'setIn'; element: FormulaExpr; funcId: RecFuncId; arg: FormulaExpr }   // x ∈ f(t)
  // Constants
  | { kind: 'true' }
  | { kind: 'false' };

/**
 * A bound variable in the proof context
 */
export type ProofVariable = {
  name: string;
  sortId: SortId;
};

/**
 * A hypothesis in the proof context
 */
export type ProofHypothesis = {
  id: string;
  name: string;
  formula: Formula;
};

/**
 * The context of a proof goal
 */
export type ProofContext = {
  variables: ProofVariable[];
  hypotheses: ProofHypothesis[];
};

/**
 * A single proof goal
 */
export type ProofGoal = {
  id: GoalId;
  context: ProofContext;
  goal: Formula;
};

/**
 * Tactics that can be applied to goals
 */
export type Tactic =
  // For ∀: introduce the variable
  | { kind: 'intro'; varName?: string }
  // For →: introduce the hypothesis
  | { kind: 'intro_hyp'; hypName?: string }
  // For ∃: provide a witness
  | { kind: 'exists_witness'; witness: FormulaExpr }
  // For ∧: split into two goals
  | { kind: 'split' }
  // For ∨: prove left or right
  | { kind: 'left' }
  | { kind: 'right' }
  // Induction on a variable (structural)
  | { kind: 'induction'; varName: string }
  // Induction on a derivation hypothesis
  | { kind: 'derivation_induction'; hypName: string }
  // Apply a hypothesis
  | { kind: 'apply'; hypName: string }
  // Apply a rule directly (for judgment goals)
  | { kind: 'apply_rule'; ruleId: RuleId }
  // For = goals: reflexivity
  | { kind: 'reflexivity' }
  // Assume the goal and derive contradiction
  | { kind: 'contradiction' }
  // Use computation (for function equalities)
  | { kind: 'compute' }
  // Case split on a term's constructor
  | { kind: 'case_analysis'; varName: string }
  // Discriminate impossible equality
  | { kind: 'discriminate'; hypName: string }
  // Rewrite using an equality hypothesis
  | { kind: 'rewrite'; hypName: string; direction?: 'ltr' | 'rtl' }
  // Unfold a function definition (e.g., size(Succ(n)) → 1 + size(n))
  | { kind: 'unfold'; funcId: RecFuncId; side: 'left' | 'right' }
  // Simplify arithmetic (evaluate constant expressions)
  | { kind: 'simplify' }
  // Trivial goal (⊤ or already in context)
  | { kind: 'trivial' }
  // Exact match with hypothesis
  | { kind: 'exact'; hypName: string };

/**
 * A proof step records which tactic was applied and resulting subgoals
 */
export type ProofStep = {
  goalId: GoalId;
  tactic: Tactic;
  resultingGoals: GoalId[];
};

/**
 * A property (theorem) to prove
 */
export type Property = {
  id: PropertyId;
  name: string;
  formula: Formula;
  description?: string;
};

/**
 * A proof attempt for a property
 */
export type Proof = {
  id: ProofId;
  propertyId: PropertyId;
  goals: Map<GoalId, ProofGoal>;
  steps: ProofStep[];
  rootGoalId: GoalId;
  openGoals: GoalId[];  // Goals not yet discharged
  status: 'incomplete' | 'complete' | 'invalid';
};

// ============================================================================
// Formula Rendering
// ============================================================================

export function renderFormulaExpr(
  expr: FormulaExpr,
  constructors: Map<ConstructorId, Constructor>,
  functions: Map<RecFuncId, RecursiveFunc>
): string {
  switch (expr.kind) {
    case 'var':
      return expr.name;
    case 'constructor': {
      const c = constructors.get(expr.constructorId);
      if (!c) return '?';
      if (expr.args.length === 0) return c.name;
      return `${c.name}(${expr.args.map(a => renderFormulaExpr(a, constructors, functions)).join(', ')})`;
    }
    case 'funcApp': {
      const f = functions.get(expr.funcId);
      return `${f?.name || '?'}(${renderFormulaExpr(expr.arg, constructors, functions)})`;
    }
    case 'int':
      return expr.value.toString();
    case 'emptySet':
      return '∅';
    case 'add':
      return `${renderFormulaExpr(expr.left, constructors, functions)} + ${renderFormulaExpr(expr.right, constructors, functions)}`;
    case 'sub':
      return `${renderFormulaExpr(expr.left, constructors, functions)} - ${renderFormulaExpr(expr.right, constructors, functions)}`;
    case 'mul':
      return `${renderFormulaExpr(expr.left, constructors, functions)} × ${renderFormulaExpr(expr.right, constructors, functions)}`;
    case 'max':
      return `max(${renderFormulaExpr(expr.left, constructors, functions)}, ${renderFormulaExpr(expr.right, constructors, functions)})`;
    case 'min':
      return `min(${renderFormulaExpr(expr.left, constructors, functions)}, ${renderFormulaExpr(expr.right, constructors, functions)})`;
  }
}

export function renderFormula(
  formula: Formula,
  constructors: Map<ConstructorId, Constructor>,
  functions: Map<RecFuncId, RecursiveFunc>,
  judgments: Map<JudgmentId, Judgment>,
  sorts: Map<SortId, Sort>,
  depth: number = 0
): string {
  const renderExpr = (e: FormulaExpr) => renderFormulaExpr(e, constructors, functions);
  
  switch (formula.kind) {
    case 'forall': {
      const sort = sorts.get(formula.sortId);
      return `∀${formula.varName}:${sort?.name || '?'}. ${renderFormula(formula.body, constructors, functions, judgments, sorts, depth + 1)}`;
    }
    case 'exists': {
      const sort = sorts.get(formula.sortId);
      return `∃${formula.varName}:${sort?.name || '?'}. ${renderFormula(formula.body, constructors, functions, judgments, sorts, depth + 1)}`;
    }
    case 'implies': {
      const left = renderFormula(formula.left, constructors, functions, judgments, sorts, depth + 1);
      const right = renderFormula(formula.right, constructors, functions, judgments, sorts, depth + 1);
      return depth > 0 ? `(${left} → ${right})` : `${left} → ${right}`;
    }
    case 'and': {
      const left = renderFormula(formula.left, constructors, functions, judgments, sorts, depth + 1);
      const right = renderFormula(formula.right, constructors, functions, judgments, sorts, depth + 1);
      return `${left} ∧ ${right}`;
    }
    case 'or': {
      const left = renderFormula(formula.left, constructors, functions, judgments, sorts, depth + 1);
      const right = renderFormula(formula.right, constructors, functions, judgments, sorts, depth + 1);
      return `${left} ∨ ${right}`;
    }
    case 'not':
      return `¬${renderFormula(formula.body, constructors, functions, judgments, sorts, depth + 1)}`;
    case 'judgment': {
      const j = judgments.get(formula.judgmentId);
      if (!j) return '?';
      const argsStr = formula.args.map(renderExpr).join(' ');
      return `${argsStr} ${j.symbol}`;
    }
    case 'termEq':
      return `${renderExpr(formula.left)} = ${renderExpr(formula.right)}`;
    case 'termNeq':
      return `${renderExpr(formula.left)} ≠ ${renderExpr(formula.right)}`;
    case 'funcEq': {
      const f = functions.get(formula.funcId);
      return `${f?.name || '?'}(${renderExpr(formula.arg)}) = ${renderExpr(formula.value)}`;
    }
    case 'funcLeq': {
      const f = functions.get(formula.funcId);
      return `${f?.name || '?'}(${renderExpr(formula.arg)}) ≤ ${renderExpr(formula.value)}`;
    }
    case 'funcLt': {
      const f = functions.get(formula.funcId);
      return `${f?.name || '?'}(${renderExpr(formula.arg)}) < ${renderExpr(formula.value)}`;
    }
    case 'setEmpty': {
      const f = functions.get(formula.funcId);
      return `${f?.name || '?'}(${renderExpr(formula.arg)}) = ∅`;
    }
    case 'setIn': {
      const f = functions.get(formula.funcId);
      return `${renderExpr(formula.element)} ∈ ${f?.name || '?'}(${renderExpr(formula.arg)})`;
    }
    case 'numEq':
      return `${renderExpr(formula.left)} = ${renderExpr(formula.right)}`;
    case 'numNeq':
      return `${renderExpr(formula.left)} ≠ ${renderExpr(formula.right)}`;
    case 'numLeq':
      return `${renderExpr(formula.left)} ≤ ${renderExpr(formula.right)}`;
    case 'numLt':
      return `${renderExpr(formula.left)} < ${renderExpr(formula.right)}`;
    case 'numGeq':
      return `${renderExpr(formula.left)} ≥ ${renderExpr(formula.right)}`;
    case 'numGt':
      return `${renderExpr(formula.left)} > ${renderExpr(formula.right)}`;
    case 'true':
      return '⊤';
    case 'false':
      return '⊥';
  }
}

// ============================================================================
// Recursive Functions over Syntax
// ============================================================================

export type RecFuncId = string;

/**
 * Return type for recursive functions
 * - 'int': Mathematical integers (ℤ)
 * - 'set': Sets of atoms from a given sort
 * - 'inductive': An inductive sort (for functions like substitution)
 */
export type FuncReturnType = 
  | { kind: 'int' }
  | { kind: 'set'; elementSortId: SortId }
  | { kind: 'inductive'; sortId: SortId };

/**
 * An argument to a recursive function
 */
export type FuncArg = {
  name: string;
  sortId: SortId;
  isPrincipal: boolean;  // Only ONE arg can be principal - this is what we recurse on
};

/**
 * Expressions in function bodies
 */
export type FuncExpr =
  // Literals
  | { kind: 'int'; value: number }
  | { kind: 'empty' }                           // ∅
  | { kind: 'singleton'; element: FuncExpr }    // {e}
  // Variables (bound by pattern match or function args)
  | { kind: 'var'; name: string }
  // Recursive call (must be structural on principal arg)
  | { kind: 'call'; funcId: RecFuncId; arg: FuncExpr }
  // Multi-arg function call
  | { kind: 'callMulti'; funcId: RecFuncId; args: FuncExpr[] }
  // Constructor application (for inductive return types)
  | { kind: 'construct'; constructorId: ConstructorId; args: FuncExpr[] }
  // Arithmetic operations (for int return type)
  | { kind: 'add'; left: FuncExpr; right: FuncExpr }      // +
  | { kind: 'sub'; left: FuncExpr; right: FuncExpr }      // -
  | { kind: 'mul'; left: FuncExpr; right: FuncExpr }      // *
  | { kind: 'max'; left: FuncExpr; right: FuncExpr }      // max
  | { kind: 'min'; left: FuncExpr; right: FuncExpr }      // min
  // Set operations (for set return type)
  | { kind: 'union'; left: FuncExpr; right: FuncExpr }    // ∪
  | { kind: 'intersect'; left: FuncExpr; right: FuncExpr } // ∩
  | { kind: 'diff'; left: FuncExpr; right: FuncExpr }     // \
  // Conditional
  | { kind: 'if'; cond: FuncPredicate; then: FuncExpr; else: FuncExpr };

/**
 * Predicates for conditionals in function bodies
 */
export type FuncPredicate =
  | { kind: 'eq'; left: FuncExpr; right: FuncExpr }       // = (works for ints and atoms)
  | { kind: 'neq'; left: FuncExpr; right: FuncExpr }      // ≠
  | { kind: 'lt'; left: FuncExpr; right: FuncExpr }       // <
  | { kind: 'leq'; left: FuncExpr; right: FuncExpr }      // ≤
  | { kind: 'gt'; left: FuncExpr; right: FuncExpr }       // >
  | { kind: 'geq'; left: FuncExpr; right: FuncExpr }      // ≥
  | { kind: 'atomEq'; left: FuncExpr; right: FuncExpr }   // atom equality
  | { kind: 'atomNeq'; left: FuncExpr; right: FuncExpr }  // atom inequality
  | { kind: 'in'; element: FuncExpr; set: FuncExpr }      // ∈
  | { kind: 'subset'; left: FuncExpr; right: FuncExpr }   // ⊆
  | { kind: 'isEmpty'; set: FuncExpr }                    // = ∅
  | { kind: 'and'; left: FuncPredicate; right: FuncPredicate }
  | { kind: 'or'; left: FuncPredicate; right: FuncPredicate }
  | { kind: 'not'; pred: FuncPredicate };

/**
 * A case in a function definition (one per constructor of principal arg)
 */
export type FuncCase = {
  constructorId: ConstructorId;
  // Variables bound by the constructor pattern (in order of args)
  boundVars: string[];
  // The expression for this case
  body: FuncExpr;
};

/**
 * A recursive function definition
 */
export type RecursiveFunc = {
  id: RecFuncId;
  name: string;
  // For backwards compatibility, inputSortId is the principal arg's sort
  inputSortId: SortId;
  // Additional non-principal arguments
  extraArgs: FuncArg[];
  returnType: FuncReturnType;
  cases: FuncCase[];
  // Termination status (computed)
  terminates?: boolean;
  terminationError?: string;
};

/**
 * Predicates that can be used in rule premises
 */
export type RulePredicate =
  | { kind: 'funcEq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }      // f(p) = e
  | { kind: 'funcNeq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }     // f(p) ≠ e
  | { kind: 'funcLt'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }      // f(p) < e
  | { kind: 'funcLeq'; funcId: RecFuncId; arg: Pattern; value: FuncExpr }     // f(p) ≤ e
  | { kind: 'funcIn'; element: Pattern; funcId: RecFuncId; arg: Pattern }     // x ∈ f(p)
  | { kind: 'funcNotIn'; element: Pattern; funcId: RecFuncId; arg: Pattern }  // x ∉ f(p)
  | { kind: 'isEmpty'; funcId: RecFuncId; arg: Pattern }                      // f(p) = ∅
  | { kind: 'notEmpty'; funcId: RecFuncId; arg: Pattern };                    // f(p) ≠ ∅

// ============================================================================
// Termination Checking
// ============================================================================

/**
 * Check if a recursive function terminates via structural recursion.
 * Returns { terminates: true } or { terminates: false, error: string }
 */
export function checkTermination(
  func: RecursiveFunc,
  constructors: Map<ConstructorId, Constructor>,
  allFunctions: Map<RecFuncId, RecursiveFunc>
): { terminates: boolean; error?: string } {
  for (const funcCase of func.cases) {
    const constructor = constructors.get(funcCase.constructorId);
    if (!constructor) {
      return { terminates: false, error: `Unknown constructor in case` };
    }
    
    // Identify which bound variables are structural subterms (same sort as input)
    const structuralVars = new Set<string>();
    constructor.args.forEach((arg, i) => {
      if (arg.sortId === func.inputSortId && funcCase.boundVars[i]) {
        structuralVars.add(funcCase.boundVars[i]);
      }
    });
    
    // Check that all recursive calls are on structural subterms
    const error = checkExprTermination(funcCase.body, func.id, structuralVars, allFunctions);
    if (error) {
      return { terminates: false, error: `In case ${constructor.name}: ${error}` };
    }
  }
  
  return { terminates: true };
}

function checkExprTermination(
  expr: FuncExpr,
  selfId: RecFuncId,
  structuralVars: Set<string>,
  allFunctions: Map<RecFuncId, RecursiveFunc>
): string | null {
  switch (expr.kind) {
    case 'int':
    case 'empty':
      return null;
      
    case 'var':
      return null;
      
    case 'singleton':
      return checkExprTermination(expr.element, selfId, structuralVars, allFunctions);
      
    case 'call':
      if (expr.funcId === selfId) {
        // Recursive call - arg must be a structural variable
        if (expr.arg.kind !== 'var') {
          return `Recursive call must be on a variable, not a complex expression`;
        }
        if (!structuralVars.has(expr.arg.name)) {
          return `Recursive call on '${expr.arg.name}' which is not a structural subterm`;
        }
      } else {
        // Call to different function - check its argument
        const argError = checkExprTermination(expr.arg, selfId, structuralVars, allFunctions);
        if (argError) return argError;
      }
      return null;

    case 'callMulti': {
      const targetFunc = allFunctions.get(expr.funcId);
      if (!targetFunc) return null; // Will be caught by type checking
      
      if (expr.funcId === selfId) {
        // Recursive call - the principal (first) arg must be a structural variable
        const principalArg = expr.args[0];
        if (!principalArg) {
          return `Recursive call has no arguments`;
        }
        if (principalArg.kind !== 'var') {
          return `Recursive call's principal argument must be a variable, not a complex expression`;
        }
        if (!structuralVars.has(principalArg.name)) {
          return `Recursive call on '${principalArg.name}' which is not a structural subterm`;
        }
        // Check other args don't have recursive calls
        for (let i = 1; i < expr.args.length; i++) {
          const argErr = checkExprTermination(expr.args[i], selfId, structuralVars, allFunctions);
          if (argErr) return argErr;
        }
      } else {
        // Call to different function - check all args
        for (const arg of expr.args) {
          const argErr = checkExprTermination(arg, selfId, structuralVars, allFunctions);
          if (argErr) return argErr;
        }
      }
      return null;
    }

    case 'construct':
      // Constructor application - check all args for termination
      for (const arg of expr.args) {
        const argErr = checkExprTermination(arg, selfId, structuralVars, allFunctions);
        if (argErr) return argErr;
      }
      return null;
      
    case 'add':
    case 'sub':
    case 'mul':
    case 'max':
    case 'min':
    case 'union':
    case 'intersect':
    case 'diff':
      const leftErr = checkExprTermination(expr.left, selfId, structuralVars, allFunctions);
      if (leftErr) return leftErr;
      return checkExprTermination(expr.right, selfId, structuralVars, allFunctions);
      
    case 'if':
      const condErr = checkPredicateTermination(expr.cond, selfId, structuralVars, allFunctions);
      if (condErr) return condErr;
      const thenErr = checkExprTermination(expr.then, selfId, structuralVars, allFunctions);
      if (thenErr) return thenErr;
      return checkExprTermination(expr.else, selfId, structuralVars, allFunctions);
  }
}

function checkPredicateTermination(
  pred: FuncPredicate,
  selfId: RecFuncId,
  structuralVars: Set<string>,
  allFunctions: Map<RecFuncId, RecursiveFunc>
): string | null {
  switch (pred.kind) {
    case 'eq':
    case 'neq':
    case 'lt':
    case 'leq':
    case 'gt':
    case 'geq':
    case 'atomEq':
    case 'atomNeq':
    case 'subset': {
      const leftErr = checkExprTermination(pred.left, selfId, structuralVars, allFunctions);
      if (leftErr) return leftErr;
      return checkExprTermination(pred.right, selfId, structuralVars, allFunctions);
    }
    
    case 'in': {
      const elemErr = checkExprTermination(pred.element, selfId, structuralVars, allFunctions);
      if (elemErr) return elemErr;
      return checkExprTermination(pred.set, selfId, structuralVars, allFunctions);
    }
      
    case 'isEmpty':
      return checkExprTermination(pred.set, selfId, structuralVars, allFunctions);
      
    case 'and':
    case 'or': {
      const lErr = checkPredicateTermination(pred.left, selfId, structuralVars, allFunctions);
      if (lErr) return lErr;
      return checkPredicateTermination(pred.right, selfId, structuralVars, allFunctions);
    }
      
    case 'not':
      return checkPredicateTermination(pred.pred, selfId, structuralVars, allFunctions);
  }
}

// ============================================================================
// Function Evaluation
// ============================================================================

// FuncValue: number for int, Set<string> for atom sets, Term for inductive return types
export type FuncValue = number | Set<string> | Term;

/**
 * Evaluate a function on a term
 */
export function evaluateFunc(
  func: RecursiveFunc,
  term: Term,
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors: Map<ConstructorId, Constructor>
): FuncValue | null {
  // Handle atom terms
  if (term.isVariable && term.variableName) {
    // Can't evaluate a function on an atom directly (unless it's the identity)
    return null;
  }
  
  // Find matching case
  const matchingCase = func.cases.find(c => c.constructorId === term.constructorId);
  if (!matchingCase) return null;
  
  const constructor = constructors.get(term.constructorId);
  if (!constructor) return null;
  
  // Build environment: map variable names to subterms or their evaluations
  const termEnv = new Map<string, Term>();
  matchingCase.boundVars.forEach((varName, i) => {
    if (varName && term.args[i]) {
      termEnv.set(varName, term.args[i]);
    }
  });
  
  return evaluateExpr(matchingCase.body, termEnv, functions, constructors, func);
}

/**
 * Evaluate a multi-arg function on a principal term and additional args in environment
 */
export function evaluateFuncMulti(
  func: RecursiveFunc,
  principalTerm: Term,
  extraEnv: Map<string, Term>,
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors: Map<ConstructorId, Constructor>
): FuncValue | null {
  // Handle atom terms
  if (principalTerm.isVariable && principalTerm.variableName) {
    return null;
  }
  
  // Find matching case
  const matchingCase = func.cases.find(c => c.constructorId === principalTerm.constructorId);
  if (!matchingCase) return null;
  
  const constructor = constructors.get(principalTerm.constructorId);
  if (!constructor) return null;
  
  // Build environment with pattern-bound vars
  const termEnv = new Map<string, Term>(extraEnv);
  matchingCase.boundVars.forEach((varName, i) => {
    if (varName && principalTerm.args[i]) {
      termEnv.set(varName, principalTerm.args[i]);
    }
  });
  
  return evaluateExpr(matchingCase.body, termEnv, functions, constructors, func);
}

function evaluateExpr(
  expr: FuncExpr,
  termEnv: Map<string, Term>,
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors: Map<ConstructorId, Constructor>,
  currentFunc: RecursiveFunc
): FuncValue | null {
  switch (expr.kind) {
    case 'int':
      return expr.value;
      
    case 'empty':
      return new Set<string>();
      
    case 'var': {
      // Variables don't evaluate to values directly - they are terms
      // Use {x} to create a singleton set, or use x in a recursive call
      return null;
    }
      
    case 'singleton': {
      const elem = evaluateExpr(expr.element, termEnv, functions, constructors, currentFunc);
      if (typeof elem === 'string') {
        return new Set([elem]);
      }
      // If it's a term variable that's an atom
      if (expr.element.kind === 'var') {
        const term = termEnv.get(expr.element.name);
        if (term?.isVariable && term.variableName) {
          return new Set([term.variableName]);
        }
      }
      return null;
    }
      
    case 'call': {
      const func = functions.get(expr.funcId);
      if (!func) return null;
      
      // Get the term to call on
      if (expr.arg.kind !== 'var') return null;
      const argTerm = termEnv.get(expr.arg.name);
      if (!argTerm) return null;
      
      return evaluateFunc(func, argTerm, functions, constructors);
    }

    case 'callMulti': {
      const func = functions.get(expr.funcId);
      if (!func) return null;
      
      // First arg is principal - must be a var that maps to a term
      if (expr.args.length === 0) return null;
      const principalArgExpr = expr.args[0];
      if (principalArgExpr.kind !== 'var') return null;
      const principalTerm = termEnv.get(principalArgExpr.name);
      if (!principalTerm) return null;
      
      // Evaluate other args and build extended environment
      const extraTermEnv = new Map(termEnv);
      for (let i = 0; i < func.extraArgs.length && i + 1 < expr.args.length; i++) {
        const argExpr = expr.args[i + 1];
        const argDef = func.extraArgs[i];
        // For inductive args, expect a var reference
        if (argExpr.kind === 'var') {
          const t = termEnv.get(argExpr.name);
          if (t) extraTermEnv.set(argDef.name, t);
        }
        // Could also handle evaluated values for other types
      }
      
      return evaluateFuncMulti(func, principalTerm, extraTermEnv, functions, constructors);
    }

    case 'construct': {
      const constr = constructors.get(expr.constructorId);
      if (!constr) return null;
      
      // Evaluate all args and build a new term
      const evaluatedArgs: Term[] = [];
      for (const argExpr of expr.args) {
        const argVal = evaluateExpr(argExpr, termEnv, functions, constructors, currentFunc);
        // If it's a Term, use it directly
        if (argVal && typeof argVal === 'object' && 'constructorId' in argVal) {
          evaluatedArgs.push(argVal as Term);
        } else if (argExpr.kind === 'var') {
          // Use the term from environment
          const t = termEnv.get(argExpr.name);
          if (t) evaluatedArgs.push(t);
          else return null;
        } else {
          return null;
        }
      }
      
      // Build the result term
      const resultTerm: Term = {
        id: `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        constructorId: expr.constructorId,
        args: evaluatedArgs
      };
      return resultTerm;
    }
      
    case 'add': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left + right;
      }
      return null;
    }
      
    case 'sub': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
      }
      return null;
    }
      
    case 'mul': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left * right;
      }
      return null;
    }
      
    case 'max': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return Math.max(left, right);
      }
      return null;
    }
      
    case 'min': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return Math.min(left, right);
      }
      return null;
    }
      
    case 'union': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (left instanceof Set && right instanceof Set) {
        return new Set([...left, ...right]);
      }
      return null;
    }
      
    case 'intersect': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (left instanceof Set && right instanceof Set) {
        return new Set([...left].filter(x => right.has(x)));
      }
      return null;
    }
      
    case 'diff': {
      const left = evaluateExpr(expr.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(expr.right, termEnv, functions, constructors, currentFunc);
      if (left instanceof Set && right instanceof Set) {
        return new Set([...left].filter(x => !right.has(x)));
      }
      return null;
    }
      
    case 'if': {
      const condResult = evaluatePredicate(expr.cond, termEnv, functions, constructors, currentFunc);
      if (condResult === null) return null;
      return condResult 
        ? evaluateExpr(expr.then, termEnv, functions, constructors, currentFunc)
        : evaluateExpr(expr.else, termEnv, functions, constructors, currentFunc);
    }
  }
}

function evaluatePredicate(
  pred: FuncPredicate,
  termEnv: Map<string, Term>,
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors: Map<ConstructorId, Constructor>,
  currentFunc: RecursiveFunc
): boolean | null {
  switch (pred.kind) {
    case 'eq': {
      const left = evaluateExpr(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(pred.right, termEnv, functions, constructors, currentFunc);
      if (left === null || right === null) return null;
      if (left instanceof Set && right instanceof Set) {
        return left.size === right.size && [...left].every(x => right.has(x));
      }
      return left === right;
    }
      
    case 'neq': {
      const eq = evaluatePredicate({ kind: 'eq', left: pred.left, right: pred.right }, termEnv, functions, constructors, currentFunc);
      return eq === null ? null : !eq;
    }
      
    case 'lt': {
      const left = evaluateExpr(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(pred.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left < right;
      }
      return null;
    }
      
    case 'leq': {
      const left = evaluateExpr(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(pred.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left <= right;
      }
      return null;
    }
      
    case 'gt': {
      const left = evaluateExpr(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(pred.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left > right;
      }
      return null;
    }
      
    case 'geq': {
      const left = evaluateExpr(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(pred.right, termEnv, functions, constructors, currentFunc);
      if (typeof left === 'number' && typeof right === 'number') {
        return left >= right;
      }
      return null;
    }

    case 'atomEq': {
      // Both sides must be atom variables
      if (pred.left.kind !== 'var' || pred.right.kind !== 'var') return null;
      const leftTerm = termEnv.get(pred.left.name);
      const rightTerm = termEnv.get(pred.right.name);
      if (!leftTerm?.isVariable || !rightTerm?.isVariable) return null;
      return leftTerm.variableName === rightTerm.variableName;
    }

    case 'atomNeq': {
      // Both sides must be atom variables
      if (pred.left.kind !== 'var' || pred.right.kind !== 'var') return null;
      const leftTerm = termEnv.get(pred.left.name);
      const rightTerm = termEnv.get(pred.right.name);
      if (!leftTerm?.isVariable || !rightTerm?.isVariable) return null;
      return leftTerm.variableName !== rightTerm.variableName;
    }
      
    case 'in': {
      const set = evaluateExpr(pred.set, termEnv, functions, constructors, currentFunc);
      if (!(set instanceof Set)) return null;
      
      // Handle case where element is from a var that refers to an atom
      if (pred.element.kind === 'var') {
        const term = termEnv.get(pred.element.name);
        if (term?.isVariable && term.variableName) {
          return set.has(term.variableName);
        }
      }
      return null;
    }
      
    case 'subset': {
      const left = evaluateExpr(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluateExpr(pred.right, termEnv, functions, constructors, currentFunc);
      if (left instanceof Set && right instanceof Set) {
        return [...left].every(x => right.has(x));
      }
      return null;
    }
      
    case 'isEmpty': {
      const set = evaluateExpr(pred.set, termEnv, functions, constructors, currentFunc);
      if (set instanceof Set) {
        return set.size === 0;
      }
      return null;
    }
      
    case 'and': {
      const left = evaluatePredicate(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluatePredicate(pred.right, termEnv, functions, constructors, currentFunc);
      if (left === null || right === null) return null;
      return left && right;
    }
      
    case 'or': {
      const left = evaluatePredicate(pred.left, termEnv, functions, constructors, currentFunc);
      const right = evaluatePredicate(pred.right, termEnv, functions, constructors, currentFunc);
      if (left === null || right === null) return null;
      return left || right;
    }
      
    case 'not': {
      const inner = evaluatePredicate(pred.pred, termEnv, functions, constructors, currentFunc);
      return inner === null ? null : !inner;
    }
  }
}

/**
 * Render a function expression as a string
 */
export function renderFuncExpr(
  expr: FuncExpr, 
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors?: Map<ConstructorId, Constructor>
): string {
  switch (expr.kind) {
    case 'int':
      return expr.value.toString();
    case 'empty':
      return '∅';
    case 'var':
      return expr.name;
    case 'singleton':
      return `{${renderFuncExpr(expr.element, functions, constructors)}}`;
    case 'call': {
      const func = functions.get(expr.funcId);
      return `${func?.name || '?'}(${renderFuncExpr(expr.arg, functions, constructors)})`;
    }
    case 'callMulti': {
      const func = functions.get(expr.funcId);
      const argStrs = expr.args.map(a => renderFuncExpr(a, functions, constructors));
      return `${func?.name || '?'}(${argStrs.join(', ')})`;
    }
    case 'construct': {
      const constr = constructors?.get(expr.constructorId);
      if (expr.args.length === 0) {
        return constr?.name || '?';
      }
      const argStrs = expr.args.map(a => renderFuncExpr(a, functions, constructors));
      return `${constr?.name || '?'}(${argStrs.join(', ')})`;
    }
    case 'add':
      return `${renderFuncExpr(expr.left, functions, constructors)} + ${renderFuncExpr(expr.right, functions, constructors)}`;
    case 'sub':
      return `${renderFuncExpr(expr.left, functions, constructors)} - ${renderFuncExpr(expr.right, functions, constructors)}`;
    case 'mul':
      return `${renderFuncExpr(expr.left, functions, constructors)} × ${renderFuncExpr(expr.right, functions, constructors)}`;
    case 'max':
      return `max(${renderFuncExpr(expr.left, functions, constructors)}, ${renderFuncExpr(expr.right, functions, constructors)})`;
    case 'min':
      return `min(${renderFuncExpr(expr.left, functions, constructors)}, ${renderFuncExpr(expr.right, functions, constructors)})`;
    case 'union':
      return `${renderFuncExpr(expr.left, functions, constructors)} ∪ ${renderFuncExpr(expr.right, functions, constructors)}`;
    case 'intersect':
      return `${renderFuncExpr(expr.left, functions, constructors)} ∩ ${renderFuncExpr(expr.right, functions, constructors)}`;
    case 'diff':
      return `${renderFuncExpr(expr.left, functions, constructors)} \\ ${renderFuncExpr(expr.right, functions, constructors)}`;
    case 'if':
      return `if ${renderFuncPred(expr.cond, functions, constructors)} then ${renderFuncExpr(expr.then, functions, constructors)} else ${renderFuncExpr(expr.else, functions, constructors)}`;
  }
}

export function renderFuncPred(
  pred: FuncPredicate, 
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors?: Map<ConstructorId, Constructor>
): string {
  switch (pred.kind) {
    case 'eq':
      return `${renderFuncExpr(pred.left, functions, constructors)} = ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'neq':
      return `${renderFuncExpr(pred.left, functions, constructors)} ≠ ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'lt':
      return `${renderFuncExpr(pred.left, functions, constructors)} < ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'leq':
      return `${renderFuncExpr(pred.left, functions, constructors)} ≤ ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'gt':
      return `${renderFuncExpr(pred.left, functions, constructors)} > ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'geq':
      return `${renderFuncExpr(pred.left, functions, constructors)} ≥ ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'atomEq':
      return `${renderFuncExpr(pred.left, functions, constructors)} ≡ ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'atomNeq':
      return `${renderFuncExpr(pred.left, functions, constructors)} ≢ ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'in':
      return `${renderFuncExpr(pred.element, functions, constructors)} ∈ ${renderFuncExpr(pred.set, functions, constructors)}`;
    case 'subset':
      return `${renderFuncExpr(pred.left, functions, constructors)} ⊆ ${renderFuncExpr(pred.right, functions, constructors)}`;
    case 'isEmpty':
      return `${renderFuncExpr(pred.set, functions, constructors)} = ∅`;
    case 'and':
      return `(${renderFuncPred(pred.left, functions, constructors)} ∧ ${renderFuncPred(pred.right, functions, constructors)})`;
    case 'or':
      return `(${renderFuncPred(pred.left, functions, constructors)} ∨ ${renderFuncPred(pred.right, functions, constructors)})`;
    case 'not':
      return `¬${renderFuncPred(pred.pred, functions, constructors)}`;
  }
}

/**
 * Render a rule side condition predicate as a string
 */
export function renderRulePredicate(
  pred: RuleFuncPredicate,
  functions: Map<RecFuncId, RecursiveFunc>,
  constructors: Map<ConstructorId, Constructor>,
  metaVariables: Map<string, MetaVariable>
): string {
  const func = functions.get(pred.funcId);
  const funcName = func?.name || '?';
  
  const renderPat = (p: Pattern): string => {
    if (p.metaVariableId) {
      const mv = metaVariables.get(p.metaVariableId);
      return mv?.name || '?';
    }
    if (p.constructorId) {
      const c = constructors.get(p.constructorId);
      if (!c) return '?';
      if (p.args.length === 0) return c.name;
      return `${c.name}(${p.args.map(renderPat).join(', ')})`;
    }
    return '_';
  };
  
  switch (pred.kind) {
    case 'eq':
      return `${funcName}(${renderPat(pred.arg)}) = ${renderFuncExpr(pred.value, functions)}`;
    case 'neq':
      return `${funcName}(${renderPat(pred.arg)}) ≠ ${renderFuncExpr(pred.value, functions)}`;
    case 'lt':
      return `${funcName}(${renderPat(pred.arg)}) < ${renderFuncExpr(pred.value, functions)}`;
    case 'leq':
      return `${funcName}(${renderPat(pred.arg)}) ≤ ${renderFuncExpr(pred.value, functions)}`;
    case 'gt':
      return `${funcName}(${renderPat(pred.arg)}) > ${renderFuncExpr(pred.value, functions)}`;
    case 'geq':
      return `${funcName}(${renderPat(pred.arg)}) ≥ ${renderFuncExpr(pred.value, functions)}`;
    case 'isEmpty':
      return `${funcName}(${renderPat(pred.arg)}) = ∅`;
    case 'notEmpty':
      return `${funcName}(${renderPat(pred.arg)}) ≠ ∅`;
    case 'in':
      return `${renderPat(pred.element)} ∈ ${funcName}(${renderPat(pred.arg)})`;
    case 'notIn':
      return `${renderPat(pred.element)} ∉ ${funcName}(${renderPat(pred.arg)})`;
  }
}

// ============================================================================
// Tactic Application (Proof Assistant Core)
// ============================================================================

export type TacticResult = 
  | { success: true; newGoals: ProofGoal[]; message?: string }
  | { success: false; error: string };

/**
 * Substitute a variable in a formula with an expression
 */
function substituteFormulaExpr(expr: FormulaExpr, varName: string, replacement: FormulaExpr): FormulaExpr {
  switch (expr.kind) {
    case 'var':
      return expr.name === varName ? replacement : expr;
    case 'constructor':
      return { ...expr, args: expr.args.map(a => substituteFormulaExpr(a, varName, replacement)) };
    case 'funcApp':
      return { ...expr, arg: substituteFormulaExpr(expr.arg, varName, replacement) };
    case 'add':
      return { kind: 'add', left: substituteFormulaExpr(expr.left, varName, replacement), right: substituteFormulaExpr(expr.right, varName, replacement) };
    case 'sub':
      return { kind: 'sub', left: substituteFormulaExpr(expr.left, varName, replacement), right: substituteFormulaExpr(expr.right, varName, replacement) };
    case 'mul':
      return { kind: 'mul', left: substituteFormulaExpr(expr.left, varName, replacement), right: substituteFormulaExpr(expr.right, varName, replacement) };
    case 'max':
      return { kind: 'max', left: substituteFormulaExpr(expr.left, varName, replacement), right: substituteFormulaExpr(expr.right, varName, replacement) };
    case 'min':
      return { kind: 'min', left: substituteFormulaExpr(expr.left, varName, replacement), right: substituteFormulaExpr(expr.right, varName, replacement) };
    default:
      return expr;
  }
}

function substituteFormula(formula: Formula, varName: string, replacement: FormulaExpr): Formula {
  switch (formula.kind) {
    case 'forall':
      if (formula.varName === varName) return formula; // Shadowed
      return { ...formula, body: substituteFormula(formula.body, varName, replacement) };
    case 'exists':
      if (formula.varName === varName) return formula; // Shadowed
      return { ...formula, body: substituteFormula(formula.body, varName, replacement) };
    case 'implies':
      return { kind: 'implies', left: substituteFormula(formula.left, varName, replacement), right: substituteFormula(formula.right, varName, replacement) };
    case 'and':
      return { kind: 'and', left: substituteFormula(formula.left, varName, replacement), right: substituteFormula(formula.right, varName, replacement) };
    case 'or':
      return { kind: 'or', left: substituteFormula(formula.left, varName, replacement), right: substituteFormula(formula.right, varName, replacement) };
    case 'not':
      return { kind: 'not', body: substituteFormula(formula.body, varName, replacement) };
    case 'judgment':
      return { ...formula, args: formula.args.map(a => substituteFormulaExpr(a, varName, replacement)) };
    case 'termEq':
      return { kind: 'termEq', left: substituteFormulaExpr(formula.left, varName, replacement), right: substituteFormulaExpr(formula.right, varName, replacement) };
    case 'termNeq':
      return { kind: 'termNeq', left: substituteFormulaExpr(formula.left, varName, replacement), right: substituteFormulaExpr(formula.right, varName, replacement) };
    case 'funcEq':
      return { ...formula, arg: substituteFormulaExpr(formula.arg, varName, replacement), value: substituteFormulaExpr(formula.value, varName, replacement) };
    case 'funcLeq':
      return { ...formula, arg: substituteFormulaExpr(formula.arg, varName, replacement), value: substituteFormulaExpr(formula.value, varName, replacement) };
    case 'funcLt':
      return { ...formula, arg: substituteFormulaExpr(formula.arg, varName, replacement), value: substituteFormulaExpr(formula.value, varName, replacement) };
    case 'setEmpty':
      return { ...formula, arg: substituteFormulaExpr(formula.arg, varName, replacement) };
    case 'setIn':
      return { ...formula, element: substituteFormulaExpr(formula.element, varName, replacement), arg: substituteFormulaExpr(formula.arg, varName, replacement) };
    case 'numEq':
    case 'numNeq':
    case 'numLeq':
    case 'numLt':
    case 'numGeq':
    case 'numGt':
      return { ...formula, left: substituteFormulaExpr(formula.left, varName, replacement), right: substituteFormulaExpr(formula.right, varName, replacement) };
    default:
      return formula;
  }
}

/**
 * Check if two formula expressions are syntactically equal
 */
function formulaExprEqual(a: FormulaExpr, b: FormulaExpr): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'var':
      return (b as typeof a).name === a.name;
    case 'constructor':
      const bc = b as typeof a;
      return a.constructorId === bc.constructorId && 
             a.args.length === bc.args.length &&
             a.args.every((arg, i) => formulaExprEqual(arg, bc.args[i]));
    case 'funcApp':
      const bf = b as typeof a;
      return a.funcId === bf.funcId && formulaExprEqual(a.arg, bf.arg);
    case 'int':
      return (b as typeof a).value === a.value;
    case 'emptySet':
      return true;
    case 'add':
    case 'sub':
    case 'mul':
    case 'max':
    case 'min':
      const bb = b as typeof a;
      return formulaExprEqual(a.left, bb.left) && formulaExprEqual(a.right, bb.right);
    default:
      return false;
  }
}

/**
 * Check if two formulas are syntactically equal
 */
function formulaEqual(a: Formula, b: Formula): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'forall':
    case 'exists':
      const bq = b as typeof a;
      return a.varName === bq.varName && a.sortId === bq.sortId && formulaEqual(a.body, bq.body);
    case 'implies':
    case 'and':
    case 'or':
      const bc = b as typeof a;
      return formulaEqual(a.left, bc.left) && formulaEqual(a.right, bc.right);
    case 'not':
      return formulaEqual(a.body, (b as typeof a).body);
    case 'judgment':
      const bj = b as typeof a;
      return a.judgmentId === bj.judgmentId && 
             a.args.length === bj.args.length &&
             a.args.every((arg, i) => formulaExprEqual(arg, bj.args[i]));
    case 'termEq':
    case 'termNeq':
      const bt = b as typeof a;
      return formulaExprEqual(a.left, bt.left) && formulaExprEqual(a.right, bt.right);
    case 'funcEq':
    case 'funcLeq':
    case 'funcLt':
      const bfe = b as typeof a;
      return a.funcId === bfe.funcId && formulaExprEqual(a.arg, bfe.arg) && formulaExprEqual(a.value, bfe.value);
    case 'setEmpty':
      const bse = b as typeof a;
      return a.funcId === bse.funcId && formulaExprEqual(a.arg, bse.arg);
    case 'setIn':
      const bsi = b as typeof a;
      return a.funcId === bsi.funcId && formulaExprEqual(a.element, bsi.element) && formulaExprEqual(a.arg, bsi.arg);
    case 'numEq':
    case 'numNeq':
    case 'numLeq':
    case 'numLt':
    case 'numGeq':
    case 'numGt':
      const bnum = b as typeof a;
      return formulaExprEqual(a.left, bnum.left) && formulaExprEqual(a.right, bnum.right);
    case 'true':
    case 'false':
      return true;
    default:
      return false;
  }
}

// ============================================================================
// Arithmetic Evaluation and Simplification
// ============================================================================

/**
 * Try to evaluate a FormulaExpr to a concrete number.
 * Returns null if the expression contains variables or function calls.
 */
function evalExprToNumber(expr: FormulaExpr): number | null {
  switch (expr.kind) {
    case 'int':
      return expr.value;
    case 'add': {
      const l = evalExprToNumber(expr.left);
      const r = evalExprToNumber(expr.right);
      if (l !== null && r !== null) return l + r;
      return null;
    }
    case 'sub': {
      const l = evalExprToNumber(expr.left);
      const r = evalExprToNumber(expr.right);
      if (l !== null && r !== null) return l - r;
      return null;
    }
    case 'mul': {
      const l = evalExprToNumber(expr.left);
      const r = evalExprToNumber(expr.right);
      if (l !== null && r !== null) return l * r;
      return null;
    }
    case 'max': {
      const l = evalExprToNumber(expr.left);
      const r = evalExprToNumber(expr.right);
      if (l !== null && r !== null) return Math.max(l, r);
      return null;
    }
    case 'min': {
      const l = evalExprToNumber(expr.left);
      const r = evalExprToNumber(expr.right);
      if (l !== null && r !== null) return Math.min(l, r);
      return null;
    }
    default:
      return null;
  }
}

/**
 * Simplify an expression by evaluating constant subexpressions.
 */
function simplifyExpr(expr: FormulaExpr): FormulaExpr {
  // First try to evaluate the whole thing
  const val = evalExprToNumber(expr);
  if (val !== null) {
    return { kind: 'int', value: val };
  }
  
  // Otherwise simplify subexpressions
  switch (expr.kind) {
    case 'add': {
      const left = simplifyExpr(expr.left);
      const right = simplifyExpr(expr.right);
      // 0 + x = x, x + 0 = x
      if (left.kind === 'int' && left.value === 0) return right;
      if (right.kind === 'int' && right.value === 0) return left;
      // Try to evaluate if both are now numbers
      const lv = evalExprToNumber(left);
      const rv = evalExprToNumber(right);
      if (lv !== null && rv !== null) return { kind: 'int', value: lv + rv };
      return { kind: 'add', left, right };
    }
    case 'sub': {
      const left = simplifyExpr(expr.left);
      const right = simplifyExpr(expr.right);
      // x - 0 = x
      if (right.kind === 'int' && right.value === 0) return left;
      // x - x = 0 (if same expression)
      if (formulaExprEqual(left, right)) return { kind: 'int', value: 0 };
      const lv = evalExprToNumber(left);
      const rv = evalExprToNumber(right);
      if (lv !== null && rv !== null) return { kind: 'int', value: lv - rv };
      return { kind: 'sub', left, right };
    }
    case 'mul': {
      const left = simplifyExpr(expr.left);
      const right = simplifyExpr(expr.right);
      // 0 * x = 0, x * 0 = 0
      if (left.kind === 'int' && left.value === 0) return { kind: 'int', value: 0 };
      if (right.kind === 'int' && right.value === 0) return { kind: 'int', value: 0 };
      // 1 * x = x, x * 1 = x
      if (left.kind === 'int' && left.value === 1) return right;
      if (right.kind === 'int' && right.value === 1) return left;
      const lv = evalExprToNumber(left);
      const rv = evalExprToNumber(right);
      if (lv !== null && rv !== null) return { kind: 'int', value: lv * rv };
      return { kind: 'mul', left, right };
    }
    case 'max': {
      const left = simplifyExpr(expr.left);
      const right = simplifyExpr(expr.right);
      // max(x, x) = x
      if (formulaExprEqual(left, right)) return left;
      const lv = evalExprToNumber(left);
      const rv = evalExprToNumber(right);
      if (lv !== null && rv !== null) return { kind: 'int', value: Math.max(lv, rv) };
      return { kind: 'max', left, right };
    }
    case 'min': {
      const left = simplifyExpr(expr.left);
      const right = simplifyExpr(expr.right);
      // min(x, x) = x
      if (formulaExprEqual(left, right)) return left;
      const lv = evalExprToNumber(left);
      const rv = evalExprToNumber(right);
      if (lv !== null && rv !== null) return { kind: 'int', value: Math.min(lv, rv) };
      return { kind: 'min', left, right };
    }
    case 'funcApp':
      return { kind: 'funcApp', funcId: expr.funcId, arg: simplifyExpr(expr.arg) };
    case 'constructor':
      return { kind: 'constructor', constructorId: expr.constructorId, args: expr.args.map(simplifyExpr) };
    default:
      return expr;
  }
}

/**
 * Result of simplifying a formula
 */
type SimplifyResult = {
  solved: boolean;      // Goal is completely solved (evaluates to true)
  newFormula?: Formula; // Simplified formula (if not solved)
  message?: string;     // Description of what was done
};

/**
 * Check if an expression is provably non-negative given hypotheses.
 * Returns true if we can prove expr ≥ 0, false otherwise.
 */
function isNonNegative(expr: FormulaExpr, hypotheses: ProofHypothesis[]): boolean {
  // Constant check
  const val = evalExprToNumber(expr);
  if (val !== null) return val >= 0;
  
  // Check if expr ≥ 0 is directly in hypotheses
  for (const h of hypotheses) {
    if (h.formula.kind === 'numGeq') {
      if (formulaExprEqual(h.formula.left, expr)) {
        const rv = evalExprToNumber(h.formula.right);
        if (rv !== null && rv <= 0) return true; // expr ≥ something ≤ 0
      }
    }
    if (h.formula.kind === 'numGt') {
      if (formulaExprEqual(h.formula.left, expr)) {
        const rv = evalExprToNumber(h.formula.right);
        if (rv !== null && rv < 0) return true; // expr > something < 0
      }
    }
  }
  
  // Recursive cases
  switch (expr.kind) {
    case 'add': {
      // a + b ≥ 0 if a ≥ 0 and b ≥ 0
      if (isNonNegative(expr.left, hypotheses) && isNonNegative(expr.right, hypotheses)) {
        return true;
      }
      break;
    }
    case 'mul': {
      // a * b ≥ 0 if both are non-negative
      if (isNonNegative(expr.left, hypotheses) && isNonNegative(expr.right, hypotheses)) {
        return true;
      }
      break;
    }
    case 'max': {
      // max(a, b) ≥ 0 if either a ≥ 0 or b ≥ 0
      if (isNonNegative(expr.left, hypotheses) || isNonNegative(expr.right, hypotheses)) {
        return true;
      }
      break;
    }
    case 'min': {
      // min(a, b) ≥ 0 if both a ≥ 0 and b ≥ 0
      if (isNonNegative(expr.left, hypotheses) && isNonNegative(expr.right, hypotheses)) {
        return true;
      }
      break;
    }
  }
  
  return false;
}

/**
 * Check if an expression is provably positive given hypotheses.
 * Returns true if we can prove expr > 0, false otherwise.
 */
function isPositive(expr: FormulaExpr, hypotheses: ProofHypothesis[]): boolean {
  const val = evalExprToNumber(expr);
  if (val !== null) return val > 0;
  
  // Check hypotheses
  for (const h of hypotheses) {
    if (h.formula.kind === 'numGt' && formulaExprEqual(h.formula.left, expr)) {
      const rv = evalExprToNumber(h.formula.right);
      if (rv !== null && rv >= 0) return true;
    }
    if (h.formula.kind === 'numGeq' && formulaExprEqual(h.formula.left, expr)) {
      const rv = evalExprToNumber(h.formula.right);
      if (rv !== null && rv > 0) return true;
    }
  }
  
  // positive + non-negative = positive
  if (expr.kind === 'add') {
    if (isPositive(expr.left, hypotheses) && isNonNegative(expr.right, hypotheses)) return true;
    if (isNonNegative(expr.left, hypotheses) && isPositive(expr.right, hypotheses)) return true;
  }
  
  return false;
}

/**
 * Check if we can prove left ≥ right given hypotheses.
 */
function canProveGeq(left: FormulaExpr, right: FormulaExpr, hypotheses: ProofHypothesis[]): boolean {
  // Check if it's in hypotheses directly
  for (const h of hypotheses) {
    if (h.formula.kind === 'numGeq' && 
        formulaExprEqual(h.formula.left, left) && 
        formulaExprEqual(h.formula.right, right)) {
      return true;
    }
    // left > right implies left ≥ right
    if (h.formula.kind === 'numGt' && 
        formulaExprEqual(h.formula.left, left) && 
        formulaExprEqual(h.formula.right, right)) {
      return true;
    }
  }
  
  // Reflexivity
  if (formulaExprEqual(left, right)) return true;
  
  // Constants
  const lv = evalExprToNumber(left);
  const rv = evalExprToNumber(right);
  if (lv !== null && rv !== null) return lv >= rv;
  
  // If right = 0, check if left is non-negative
  if (rv !== null && rv === 0) {
    return isNonNegative(left, hypotheses);
  }
  
  // a + c ≥ b where we know a ≥ b and c ≥ 0
  if (left.kind === 'add') {
    if (canProveGeq(left.left, right, hypotheses) && isNonNegative(left.right, hypotheses)) return true;
    if (canProveGeq(left.right, right, hypotheses) && isNonNegative(left.left, hypotheses)) return true;
  }
  
  return false;
}

/**
 * Try to solve a goal using hypotheses (linear arithmetic reasoning).
 */
function tryLinearArithmetic(formula: Formula, hypotheses: ProofHypothesis[]): SimplifyResult {
  switch (formula.kind) {
    case 'numGeq':
      if (canProveGeq(formula.left, formula.right, hypotheses)) {
        return { solved: true, message: 'By arithmetic reasoning' };
      }
      break;
    case 'numGt': {
      const rv = evalExprToNumber(formula.right);
      // left > 0 if left is positive
      if (rv !== null && rv === 0 && isPositive(formula.left, hypotheses)) {
        return { solved: true, message: 'By arithmetic reasoning' };
      }
      // left > right if left ≥ right + 1 (for integers)
      break;
    }
    case 'numLeq':
      // left ≤ right is same as right ≥ left
      if (canProveGeq(formula.right, formula.left, hypotheses)) {
        return { solved: true, message: 'By arithmetic reasoning' };
      }
      break;
    case 'numLt': {
      // left < right is same as right > left
      const lv = evalExprToNumber(formula.left);
      if (lv !== null && lv === 0 && isPositive(formula.right, hypotheses)) {
        return { solved: true, message: 'By arithmetic reasoning' };
      }
      break;
    }
  }
  return { solved: false };
}

/**
 * Check if a comparison is trivially true
 */
function checkTrivialComparison(
  left: FormulaExpr, 
  right: FormulaExpr, 
  kind: 'numEq' | 'numNeq' | 'numLeq' | 'numLt' | 'numGeq' | 'numGt'
): boolean | null {
  const lv = evalExprToNumber(left);
  const rv = evalExprToNumber(right);
  
  if (lv !== null && rv !== null) {
    switch (kind) {
      case 'numEq': return lv === rv;
      case 'numNeq': return lv !== rv;
      case 'numLeq': return lv <= rv;
      case 'numLt': return lv < rv;
      case 'numGeq': return lv >= rv;
      case 'numGt': return lv > rv;
    }
  }
  
  // Check reflexivity: x op x
  if (formulaExprEqual(left, right)) {
    switch (kind) {
      case 'numEq': return true;   // x = x
      case 'numLeq': return true;  // x ≤ x
      case 'numGeq': return true;  // x ≥ x
      case 'numLt': return false;  // x < x is false
      case 'numGt': return false;  // x > x is false
      case 'numNeq': return false; // x ≠ x is false
    }
  }
  
  return null; // Can't determine
}

/**
 * Simplify a formula, potentially solving it completely.
 */
function simplifyFormula(formula: Formula): SimplifyResult {
  switch (formula.kind) {
    case 'true':
      return { solved: true, message: 'Already true' };
    
    case 'false':
      return { solved: false, newFormula: formula, message: 'Goal is false' };
    
    case 'numEq':
    case 'numNeq':
    case 'numLeq':
    case 'numLt':
    case 'numGeq':
    case 'numGt': {
      const left = simplifyExpr(formula.left);
      const right = simplifyExpr(formula.right);
      
      const trivial = checkTrivialComparison(left, right, formula.kind);
      if (trivial === true) {
        const ops = { numEq: '=', numNeq: '≠', numLeq: '≤', numLt: '<', numGeq: '≥', numGt: '>' };
        return { solved: true, message: `${evalExprToNumber(left) ?? '?'} ${ops[formula.kind]} ${evalExprToNumber(right) ?? '?'} ✓` };
      }
      if (trivial === false) {
        return { solved: false, newFormula: { kind: 'false' }, message: 'Comparison is false' };
      }
      
      // Return simplified version
      const newFormula = { ...formula, left, right } as Formula;
      if (!formulaExprEqual(left, formula.left) || !formulaExprEqual(right, formula.right)) {
        return { solved: false, newFormula, message: 'Simplified arithmetic' };
      }
      return { solved: false, newFormula: formula };
    }
    
    case 'and': {
      const leftResult = simplifyFormula(formula.left);
      const rightResult = simplifyFormula(formula.right);
      
      // If both solved, whole thing is solved
      if (leftResult.solved && rightResult.solved) {
        return { solved: true, message: 'Both sides true' };
      }
      // If one is solved, return the other
      if (leftResult.solved) {
        return { solved: false, newFormula: rightResult.newFormula || formula.right, message: 'Left side true' };
      }
      if (rightResult.solved) {
        return { solved: false, newFormula: leftResult.newFormula || formula.left, message: 'Right side true' };
      }
      
      return { solved: false, newFormula: formula };
    }
    
    case 'or': {
      const leftResult = simplifyFormula(formula.left);
      const rightResult = simplifyFormula(formula.right);
      
      // If either is solved, whole thing is solved
      if (leftResult.solved || rightResult.solved) {
        return { solved: true, message: 'One side true' };
      }
      
      return { solved: false, newFormula: formula };
    }
    
    case 'implies': {
      const rightResult = simplifyFormula(formula.right);
      // If conclusion is trivially true, implication is true
      if (rightResult.solved) {
        return { solved: true, message: 'Conclusion is true' };
      }
      return { solved: false, newFormula: formula };
    }
    
    default:
      return { solved: false, newFormula: formula };
  }
}

/**
 * Check if a goal can be automatically solved (for UI hints)
 */
export function isGoalTrivial(
  formula: Formula, 
  hypotheses: ProofHypothesis[] = []
): { trivial: boolean; tactic?: string; message?: string } {
  // Check for trivial true
  if (formula.kind === 'true') {
    return { trivial: true, tactic: 'trivial', message: 'Goal is ⊤' };
  }
  
  // Check if goal is in hypotheses
  for (const h of hypotheses) {
    if (formulaEqual(h.formula, formula)) {
      return { trivial: true, tactic: 'trivial', message: `Follows from ${h.name}` };
    }
  }
  
  // Check for reflexivity on comparisons first
  if (formula.kind === 'numEq' || formula.kind === 'numLeq' || formula.kind === 'numGeq' || formula.kind === 'termEq') {
    const f = formula as { left: FormulaExpr; right: FormulaExpr };
    if (formulaExprEqual(f.left, f.right)) {
      return { trivial: true, tactic: 'reflexivity', message: 'Both sides equal' };
    }
    // Also check after simplification
    const leftSimp = simplifyExpr(f.left);
    const rightSimp = simplifyExpr(f.right);
    if (formulaExprEqual(leftSimp, rightSimp)) {
      return { trivial: true, tactic: 'simplify', message: 'Equal after simplification' };
    }
  }
  
  // Check if comparison is decidable by arithmetic
  const result = simplifyFormula(formula);
  if (result.solved) {
    return { trivial: true, tactic: 'simplify', message: result.message };
  }
  
  // Check if it can be solved using hypotheses (linear arithmetic)
  const arithResult = tryLinearArithmetic(formula, hypotheses);
  if (arithResult.solved) {
    return { trivial: true, tactic: 'simplify', message: arithResult.message };
  }
  
  return { trivial: false };
}

/**
 * Try to match a FormulaExpr against a constructor pattern.
 * Returns a mapping from bound variable names to subexpressions if successful.
 */
function matchAgainstConstructor(
  expr: FormulaExpr,
  constructorId: ConstructorId,
  boundVars: string[],
  constructors: Map<ConstructorId, Constructor>
): Map<string, FormulaExpr> | null {
  // The expression must be a constructor application
  if (expr.kind !== 'constructor') {
    // Could be a variable - we can't match
    return null;
  }
  
  if (expr.constructorId !== constructorId) {
    return null; // Different constructor
  }
  
  const constructor = constructors.get(constructorId);
  if (!constructor) return null;
  
  // The number of args must match the number of bound vars
  if (expr.args.length !== boundVars.length) {
    return null;
  }
  
  // Create bindings for each bound variable
  const bindings = new Map<string, FormulaExpr>();
  for (let i = 0; i < boundVars.length; i++) {
    bindings.set(boundVars[i], expr.args[i]);
  }
  
  return bindings;
}

/**
 * Convert a FuncExpr to FormulaExpr, substituting bound variables.
 */
function funcExprToFormulaExpr(
  expr: FuncExpr,
  bindings: Map<string, FormulaExpr>,
  func: RecursiveFunc,
  functions: Map<RecFuncId, RecursiveFunc>
): FormulaExpr {
  switch (expr.kind) {
    case 'int':
      return { kind: 'int', value: expr.value };
    
    case 'var': {
      // Look up the variable in bindings
      const bound = bindings.get(expr.name);
      if (bound) return bound;
      // If not found, keep as variable (shouldn't happen in well-formed functions)
      return { kind: 'var', name: expr.name };
    }
    
    case 'call': {
      // Recursive call - convert to funcApp
      const argExpr = funcExprToFormulaExpr(expr.arg, bindings, func, functions);
      return { kind: 'funcApp', funcId: expr.funcId, arg: argExpr };
    }
    
    case 'add': {
      const left = funcExprToFormulaExpr(expr.left, bindings, func, functions);
      const right = funcExprToFormulaExpr(expr.right, bindings, func, functions);
      return { kind: 'add', left, right };
    }
    
    case 'sub': {
      const left = funcExprToFormulaExpr(expr.left, bindings, func, functions);
      const right = funcExprToFormulaExpr(expr.right, bindings, func, functions);
      return { kind: 'sub', left, right };
    }
    
    case 'empty':
      return { kind: 'emptySet' };
    
    // For operations not directly expressible in FormulaExpr, 
    // we'd need to extend FormulaExpr or handle specially
    case 'mul':
    case 'max':
    case 'min':
    case 'union':
    case 'intersect':
    case 'diff':
    case 'singleton':
    case 'if':
      // For now, return a placeholder - these would need more work
      return { kind: 'int', value: 0 };
    
    default:
      return { kind: 'int', value: 0 };
  }
}

/**
 * Try to unfold a function application.
 * Returns the unfolded expression if successful, null otherwise.
 */
function unfoldFuncApp(
  expr: FormulaExpr,
  targetFunc: RecursiveFunc,
  constructors: Map<ConstructorId, Constructor>,
  functions: Map<RecFuncId, RecursiveFunc>
): FormulaExpr | null {
  // If this is a funcApp for the target function, try to unfold it
  if (expr.kind === 'funcApp' && expr.funcId === targetFunc.id) {
    // Try each case
    for (const funcCase of targetFunc.cases) {
      const bindings = matchAgainstConstructor(
        expr.arg,
        funcCase.constructorId,
        funcCase.boundVars,
        constructors
      );
      
      if (bindings) {
        // Found a matching case - substitute and return
        return funcExprToFormulaExpr(funcCase.body, bindings, targetFunc, functions);
      }
    }
    // No matching case found
    return null;
  }
  
  // Recursively try to unfold in subexpressions
  switch (expr.kind) {
    case 'add': {
      const leftUnfold = unfoldFuncApp(expr.left, targetFunc, constructors, functions);
      if (leftUnfold) return { kind: 'add', left: leftUnfold, right: expr.right };
      const rightUnfold = unfoldFuncApp(expr.right, targetFunc, constructors, functions);
      if (rightUnfold) return { kind: 'add', left: expr.left, right: rightUnfold };
      return null;
    }
    case 'sub': {
      const leftUnfold = unfoldFuncApp(expr.left, targetFunc, constructors, functions);
      if (leftUnfold) return { kind: 'sub', left: leftUnfold, right: expr.right };
      const rightUnfold = unfoldFuncApp(expr.right, targetFunc, constructors, functions);
      if (rightUnfold) return { kind: 'sub', left: expr.left, right: rightUnfold };
      return null;
    }
    case 'funcApp': {
      // Different function - try to unfold the argument
      const argUnfold = unfoldFuncApp(expr.arg, targetFunc, constructors, functions);
      if (argUnfold) return { kind: 'funcApp', funcId: expr.funcId, arg: argUnfold };
      return null;
    }
    case 'constructor': {
      // Try to unfold in constructor args
      for (let i = 0; i < expr.args.length; i++) {
        const unfoldedArg = unfoldFuncApp(expr.args[i], targetFunc, constructors, functions);
        if (unfoldedArg) {
          const newArgs = [...expr.args];
          newArgs[i] = unfoldedArg;
          return { kind: 'constructor', constructorId: expr.constructorId, args: newArgs };
        }
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Apply a tactic to a proof goal
 * Returns new goals if successful, or an error message
 */
export function applyTactic(
  goal: ProofGoal,
  tactic: Tactic,
  constructors: Map<ConstructorId, Constructor>,
  sorts: Map<SortId, Sort>,
  _functions: Map<RecFuncId, RecursiveFunc>,
  _rules: Map<RuleId, InferenceRule>
): TacticResult {
  const { context, goal: formula } = goal;
  
  switch (tactic.kind) {
    // ∀-introduction: For goal ∀x:S. P, introduce x and prove P
    case 'intro': {
      if (formula.kind !== 'forall') {
        return { success: false, error: 'intro requires a ∀ goal' };
      }
      const varName = tactic.varName || formula.varName;
      // Check name collision
      if (context.variables.some(v => v.name === varName)) {
        return { success: false, error: `Variable ${varName} already in context` };
      }
      const newGoal: ProofGoal = {
        id: uuidv4(),
        context: {
          variables: [...context.variables, { name: varName, sortId: formula.sortId }],
          hypotheses: context.hypotheses,
        },
        goal: varName === formula.varName 
          ? formula.body 
          : substituteFormula(formula.body, formula.varName, { kind: 'var', name: varName }),
      };
      return { success: true, newGoals: [newGoal], message: `Introduced ${varName}` };
    }
    
    // →-introduction: For goal P → Q, assume P and prove Q
    case 'intro_hyp': {
      if (formula.kind !== 'implies') {
        return { success: false, error: 'intro_hyp requires a → goal' };
      }
      const hypName = tactic.hypName || `H${context.hypotheses.length}`;
      if (context.hypotheses.some(h => h.name === hypName)) {
        return { success: false, error: `Hypothesis ${hypName} already in context` };
      }
      const newGoal: ProofGoal = {
        id: uuidv4(),
        context: {
          variables: context.variables,
          hypotheses: [...context.hypotheses, { id: uuidv4(), name: hypName, formula: formula.left }],
        },
        goal: formula.right,
      };
      return { success: true, newGoals: [newGoal], message: `Assumed ${hypName}` };
    }
    
    // ∃-introduction: For goal ∃x:S. P, provide witness and prove P[x/witness]
    case 'exists_witness': {
      if (formula.kind !== 'exists') {
        return { success: false, error: 'exists_witness requires a ∃ goal' };
      }
      const newGoal: ProofGoal = {
        id: uuidv4(),
        context,
        goal: substituteFormula(formula.body, formula.varName, tactic.witness),
      };
      return { success: true, newGoals: [newGoal], message: 'Provided witness' };
    }
    
    // ∧-introduction: For goal P ∧ Q, prove both P and Q
    case 'split': {
      if (formula.kind !== 'and') {
        return { success: false, error: 'split requires a ∧ goal' };
      }
      const leftGoal: ProofGoal = { id: uuidv4(), context, goal: formula.left };
      const rightGoal: ProofGoal = { id: uuidv4(), context, goal: formula.right };
      return { success: true, newGoals: [leftGoal, rightGoal], message: 'Split conjunction' };
    }
    
    // ∨-introduction (left): For goal P ∨ Q, prove P
    case 'left': {
      if (formula.kind !== 'or') {
        return { success: false, error: 'left requires a ∨ goal' };
      }
      const newGoal: ProofGoal = { id: uuidv4(), context, goal: formula.left };
      return { success: true, newGoals: [newGoal], message: 'Proving left disjunct' };
    }
    
    // ∨-introduction (right): For goal P ∨ Q, prove Q
    case 'right': {
      if (formula.kind !== 'or') {
        return { success: false, error: 'right requires a ∨ goal' };
      }
      const newGoal: ProofGoal = { id: uuidv4(), context, goal: formula.right };
      return { success: true, newGoals: [newGoal], message: 'Proving right disjunct' };
    }
    
    // Structural induction on a variable
    case 'induction': {
      const varInfo = context.variables.find(v => v.name === tactic.varName);
      if (!varInfo) {
        return { success: false, error: `Variable ${tactic.varName} not in context` };
      }
      const sort = sorts.get(varInfo.sortId);
      if (!sort || sort.kind !== 'inductive') {
        return { success: false, error: `Cannot do induction on ${tactic.varName}: not an inductive type` };
      }
      
      // Get constructors for this sort
      const sortConstructors = Array.from(constructors.values()).filter(c => c.sortId === varInfo.sortId);
      if (sortConstructors.length === 0) {
        return { success: false, error: 'No constructors found for sort' };
      }
      
      // Create one goal per constructor
      const newGoals: ProofGoal[] = sortConstructors.map(c => {
        // For constructor C(a1:S1, ..., an:Sn), introduce fresh variables
        // and add IH for recursive arguments
        const freshVars: ProofVariable[] = c.args.map((arg, i) => ({
          name: `${arg.label || `x${i}`}`,
          sortId: arg.sortId,
        }));
        
        // Build the constructor term
        const constructorExpr: FormulaExpr = {
          kind: 'constructor',
          constructorId: c.id,
          args: freshVars.map(v => ({ kind: 'var', name: v.name })),
        };
        
        // Substitute the induction variable with the constructor term
        const substitutedGoal = substituteFormula(formula, tactic.varName, constructorExpr);
        
        // For recursive arguments (same sort), add induction hypotheses
        const inductionHypotheses: ProofHypothesis[] = [];
        c.args.forEach((arg, i) => {
          if (arg.sortId === varInfo.sortId) {
            const ihFormula = substituteFormula(formula, tactic.varName, { kind: 'var', name: freshVars[i].name });
            inductionHypotheses.push({
              id: uuidv4(),
              name: `IH_${freshVars[i].name}`,
              formula: ihFormula,
            });
          }
        });
        
        // Filter out the original variable and add fresh ones
        const newVars = [
          ...context.variables.filter(v => v.name !== tactic.varName),
          ...freshVars,
        ];
        
        return {
          id: uuidv4(),
          context: {
            variables: newVars,
            hypotheses: [...context.hypotheses, ...inductionHypotheses],
          },
          goal: substitutedGoal,
        };
      });
      
      return { success: true, newGoals, message: `Induction on ${tactic.varName} (${sortConstructors.length} cases)` };
    }
    
    // Reflexivity: For goal t = t, done
    case 'reflexivity': {
      // Works for: x = x, x ≤ x, x ≥ x
      const isReflexiveKind = formula.kind === 'termEq' || formula.kind === 'numEq' || 
                               formula.kind === 'numLeq' || formula.kind === 'numGeq';
      
      if (!isReflexiveKind) {
        return { success: false, error: 'reflexivity requires =, ≤, or ≥ goal' };
      }
      
      const f = formula as { left: FormulaExpr; right: FormulaExpr };
      if (!formulaExprEqual(f.left, f.right)) {
        // Try simplifying first
        const leftSimp = simplifyExpr(f.left);
        const rightSimp = simplifyExpr(f.right);
        if (formulaExprEqual(leftSimp, rightSimp)) {
          return { success: true, newGoals: [], message: 'Reflexivity (after simplification)' };
        }
        return { success: false, error: 'Terms are not equal' };
      }
      return { success: true, newGoals: [], message: 'Reflexivity' };
    }
    
    // Trivial: For ⊤ or if goal is in hypotheses
    case 'trivial': {
      if (formula.kind === 'true') {
        return { success: true, newGoals: [], message: 'Trivial (⊤)' };
      }
      // Check if goal is directly in hypotheses
      const matching = context.hypotheses.find(h => formulaEqual(h.formula, formula));
      if (matching) {
        return { success: true, newGoals: [], message: `Trivial (from ${matching.name})` };
      }
      return { success: false, error: 'Goal is not trivially true' };
    }
    
    // Exact: Goal matches a hypothesis exactly
    case 'exact': {
      const hyp = context.hypotheses.find(h => h.name === tactic.hypName);
      if (!hyp) {
        return { success: false, error: `Hypothesis ${tactic.hypName} not found` };
      }
      if (!formulaEqual(hyp.formula, formula)) {
        return { success: false, error: `Hypothesis ${tactic.hypName} does not match goal` };
      }
      return { success: true, newGoals: [], message: `Exact ${tactic.hypName}` };
    }
    
    // Case analysis on a variable
    case 'case_analysis': {
      const varInfo = context.variables.find(v => v.name === tactic.varName);
      if (!varInfo) {
        return { success: false, error: `Variable ${tactic.varName} not in context` };
      }
      const sort = sorts.get(varInfo.sortId);
      if (!sort || sort.kind !== 'inductive') {
        return { success: false, error: `Cannot do case analysis on ${tactic.varName}: not an inductive type` };
      }
      
      const sortConstructors = Array.from(constructors.values()).filter(c => c.sortId === varInfo.sortId);
      
      const newGoals: ProofGoal[] = sortConstructors.map(c => {
        const freshVars: ProofVariable[] = c.args.map((arg, i) => ({
          name: `${arg.label || `x${i}`}`,
          sortId: arg.sortId,
        }));
        
        const constructorExpr: FormulaExpr = {
          kind: 'constructor',
          constructorId: c.id,
          args: freshVars.map(v => ({ kind: 'var', name: v.name })),
        };
        
        const substitutedGoal = substituteFormula(formula, tactic.varName, constructorExpr);
        
        const newVars = [
          ...context.variables.filter(v => v.name !== tactic.varName),
          ...freshVars,
        ];
        
        return {
          id: uuidv4(),
          context: {
            variables: newVars,
            hypotheses: context.hypotheses,
          },
          goal: substitutedGoal,
        };
      });
      
      return { success: true, newGoals, message: `Case analysis on ${tactic.varName} (${sortConstructors.length} cases)` };
    }
    
    // Discriminate: Derive ⊥ from impossible equality like Z = S(n)
    case 'discriminate': {
      const hyp = context.hypotheses.find(h => h.name === tactic.hypName);
      if (!hyp) {
        return { success: false, error: `Hypothesis ${tactic.hypName} not found` };
      }
      if (hyp.formula.kind !== 'termEq') {
        return { success: false, error: `Hypothesis ${tactic.hypName} is not an equality` };
      }
      const { left, right } = hyp.formula;
      // Check if they have different head constructors
      if (left.kind === 'constructor' && right.kind === 'constructor') {
        if (left.constructorId !== right.constructorId) {
          return { success: true, newGoals: [], message: `Discriminate ${tactic.hypName}` };
        }
      }
      return { success: false, error: 'Cannot discriminate: constructors are not different' };
    }
    
    // Apply hypothesis (for implications)
    case 'apply': {
      const hyp = context.hypotheses.find(h => h.name === tactic.hypName);
      if (!hyp) {
        return { success: false, error: `Hypothesis ${tactic.hypName} not found` };
      }
      
      // If hypothesis is P → Q and goal is Q, create goal P
      if (hyp.formula.kind === 'implies') {
        if (formulaEqual(hyp.formula.right, formula)) {
          const newGoal: ProofGoal = { id: uuidv4(), context, goal: hyp.formula.left };
          return { success: true, newGoals: [newGoal], message: `Applied ${tactic.hypName}` };
        }
      }
      
      // If hypothesis is ∀x. P → Q, try to instantiate
      if (hyp.formula.kind === 'forall') {
        // This is more complex - would need unification
        return { success: false, error: 'Direct application of ∀ hypotheses not yet supported' };
      }
      
      return { success: false, error: `Cannot apply ${tactic.hypName} to this goal` };
    }
    
    // Unfold a function definition
    case 'unfold': {
      const func = _functions.get(tactic.funcId);
      if (!func) {
        return { success: false, error: 'Function not found' };
      }
      
      // Get the expression to unfold based on side
      const isComparisonFormula = formula.kind === 'numEq' || formula.kind === 'numGeq' || 
          formula.kind === 'numLeq' || formula.kind === 'numGt' || formula.kind === 'numLt' || 
          formula.kind === 'numNeq' || formula.kind === 'termEq' || formula.kind === 'termNeq';
      
      if (!isComparisonFormula) {
        return { success: false, error: 'Unfold only works on equality/comparison goals' };
      }
      
      const expr = tactic.side === 'left' ? (formula as { left: FormulaExpr }).left : (formula as { right: FormulaExpr }).right;
      
      // Find the outermost function application for this function
      const unfoldedExpr = unfoldFuncApp(expr, func, constructors, _functions);
      
      if (!unfoldedExpr) {
        return { success: false, error: `Could not unfold ${func.name} - no matching case found` };
      }
      
      // Create new formula with the unfolded expression
      let newFormula: Formula;
      if (tactic.side === 'left') {
        newFormula = { ...formula, left: unfoldedExpr } as Formula;
      } else {
        newFormula = { ...formula, right: unfoldedExpr } as Formula;
      }
      
      const newGoal: ProofGoal = { id: uuidv4(), context, goal: newFormula };
      return { success: true, newGoals: [newGoal], message: `Unfolded ${func.name}` };
    }
    
    // Simplify arithmetic
    case 'simplify': {
      // First try to solve using hypotheses (linear arithmetic)
      const arithResult = tryLinearArithmetic(formula, context.hypotheses);
      if (arithResult.solved) {
        return { success: true, newGoals: [], message: arithResult.message || 'Solved by arithmetic' };
      }
      
      // Try to evaluate and simplify the goal
      const simplified = simplifyFormula(formula);
      
      if (simplified.solved) {
        return { success: true, newGoals: [], message: simplified.message || 'Simplified to true' };
      }
      
      if (simplified.newFormula && !formulaEqual(simplified.newFormula, formula)) {
        const newGoal: ProofGoal = { id: uuidv4(), context, goal: simplified.newFormula };
        return { success: true, newGoals: [newGoal], message: simplified.message || 'Simplified' };
      }
      
      return { success: false, error: 'Cannot simplify further' };
    }
    
    default:
      return { success: false, error: `Tactic ${tactic.kind} not implemented` };
  }
}

/**
 * Create initial proof for a property
 */
export function createProof(property: Property): Proof {
  const rootGoal: ProofGoal = {
    id: uuidv4(),
    context: { variables: [], hypotheses: [] },
    goal: property.formula,
  };
  
  return {
    id: uuidv4(),
    propertyId: property.id,
    goals: new Map([[rootGoal.id, rootGoal]]),
    steps: [],
    rootGoalId: rootGoal.id,
    openGoals: [rootGoal.id],
    status: 'incomplete',
  };
}

/**
 * Apply a tactic to an open goal in a proof
 */
export function applyTacticToProof(
  proof: Proof,
  goalId: GoalId,
  tactic: Tactic,
  constructors: Map<ConstructorId, Constructor>,
  sorts: Map<SortId, Sort>,
  functions: Map<RecFuncId, RecursiveFunc>,
  rules: Map<RuleId, InferenceRule>
): { proof: Proof; result: TacticResult } {
  const goal = proof.goals.get(goalId);
  if (!goal) {
    return { proof, result: { success: false, error: 'Goal not found' } };
  }
  
  if (!proof.openGoals.includes(goalId)) {
    return { proof, result: { success: false, error: 'Goal already proved' } };
  }
  
  const result = applyTactic(goal, tactic, constructors, sorts, functions, rules);
  
  if (!result.success) {
    return { proof, result };
  }
  
  // Add new goals to the proof
  const newGoalsMap = new Map(proof.goals);
  for (const newGoal of result.newGoals) {
    newGoalsMap.set(newGoal.id, newGoal);
  }
  
  // Update open goals: remove current, add new
  const newOpenGoals = proof.openGoals
    .filter(id => id !== goalId)
    .concat(result.newGoals.map(g => g.id));
  
  // Record the step
  const step: ProofStep = {
    goalId,
    tactic,
    resultingGoals: result.newGoals.map(g => g.id),
  };
  
  const newProof: Proof = {
    ...proof,
    goals: newGoalsMap,
    steps: [...proof.steps, step],
    openGoals: newOpenGoals,
    status: newOpenGoals.length === 0 ? 'complete' : 'incomplete',
  };
  
  return { proof: newProof, result };
}

// ============================================================================
// State Management
// ============================================================================

export type AppState = {
  sorts: Map<SortId, Sort>;
  constructors: Map<ConstructorId, Constructor>;
  judgments: Map<JudgmentId, Judgment>;
  rules: Map<RuleId, InferenceRule>;
  metaVariables: Map<string, MetaVariable>;
  selectedSortId: SortId | null;
  selectedJudgmentId: JudgmentId | null;
};

// ============================================================================
// Factory Functions
// ============================================================================

export function createSort(
  name: string, 
  kind: SortKind = 'inductive',
  isBinderSort = false,
  atomPrefix?: string
): Sort {
  // For atom sorts, default prefix to the sort name lowercase
  const prefix = kind === 'atom' ? (atomPrefix || name.toLowerCase().charAt(0)) : undefined;
  
  // Colors: atoms get different shades based on bindability
  let color: string;
  if (kind === 'atom') {
    color = isBinderSort ? '#a78bfa' : '#f59e0b'; // purple for bindable, amber for unbindable
  } else {
    color = isBinderSort ? '#a78bfa' : '#60a5fa'; // purple for binder sorts, blue for regular
  }
  
  return {
    id: uuidv4(),
    name,
    kind,
    isBinderSort,
    color,
    atomPrefix: prefix,
  };
}

export function createConstructor(
  sortId: SortId,
  name: string,
  args: Omit<ConstructorArg, 'id'>[] = []
): Constructor {
  const fullArgs = args.map(arg => ({ ...arg, id: uuidv4() }));
  const isTerminal = !fullArgs.some(arg => arg.sortId === sortId);
  return {
    id: uuidv4(),
    sortId,
    name,
    args: fullArgs,
    isTerminal,
  };
}

/**
 * Creates a judgment with appropriate default separators based on arg count.
 * @param separators Optional custom separators. If not provided, defaults are generated.
 */
export function createJudgment(
  name: string,
  symbol: string,
  argSorts: { sortId: SortId; label: string }[],
  separators?: string[]
): Judgment {
  // Generate default separators if not provided
  const defaultSeparators = generateDefaultSeparators(argSorts.length, symbol);
  
  return {
    id: uuidv4(),
    name,
    symbol,
    separators: separators || defaultSeparators,
    argSorts,
    color: '#f472b6',
  };
}

/**
 * Generate sensible default separators based on argument count
 */
export function generateDefaultSeparators(argCount: number, symbol: string): string[] {
  if (argCount === 1) {
    // Unary: "e val" or "closed(e)" - put symbol as suffix
    return ['', ` ${symbol}`];
  } else if (argCount === 2) {
    // Binary: "e ↓ v" - symbol between
    return ['', ` ${symbol} `, ''];
  } else if (argCount === 3) {
    // Ternary: "Γ ⊢ e : τ" - main symbol after first, colon after second
    return ['', ` ${symbol} `, ' : ', ''];
  } else {
    // 4+ args: main symbol after first, commas between rest
    const seps = ['', ` ${symbol} `];
    for (let i = 2; i < argCount; i++) {
      seps.push(', ');
    }
    seps.push('');
    return seps;
  }
}

export function createInferenceRule(
  name: string,
  conclusion: JudgmentInstance,
  premises: JudgmentInstance[] = [],
  sideConditions: SideCondition[] = []
): InferenceRule {
  return {
    id: uuidv4(),
    name,
    premises,
    sideConditions,
    conclusion,
    position: { x: 0, y: 0 },
  };
}

export function createMetaVariable(name: string, sortId: SortId): MetaVariable {
  return {
    id: uuidv4(),
    name,
    sortId,
  };
}

export function createPattern(
  constructorId?: ConstructorId,
  metaVariableId?: string,
  args: Pattern[] = []
): Pattern {
  return {
    id: uuidv4(),
    constructorId,
    metaVariableId,
    args,
  };
}

export function createJudgmentInstance(
  judgmentId: JudgmentId,
  args: Pattern[]
): JudgmentInstance {
  return {
    id: uuidv4(),
    judgmentId,
    args,
  };
}

// ============================================================================
// Term Generation
// ============================================================================

// Helper to convert number to subscript
function toSubscript(n: number): string {
  const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return n.toString().split('').map(d => subscripts[parseInt(d)]).join('');
}

// Counter for generating unique atom names
let atomCounter = 0;

export function resetAtomCounter(): void {
  atomCounter = 0;
}

export function generateRandomTerm(
  sortId: SortId,
  constructors: Map<ConstructorId, Constructor>,
  sorts: Map<SortId, Sort>,
  maxDepth: number = 3,
  currentDepth: number = 0
): Term | null {
  const sort = sorts.get(sortId);
  
  // Handle atom sorts - generate a fresh atom name
  if (sort?.kind === 'atom') {
    atomCounter++;
    const name = `${sort.atomPrefix || sort.name.toLowerCase().charAt(0)}${toSubscript(atomCounter)}`;
    return {
      id: uuidv4(),
      constructorId: '', // No constructor for atoms
      args: [],
      isVariable: true,
      variableName: name,
    };
  }

  // Handle inductive sorts
  const sortConstructors = Array.from(constructors.values()).filter(
    c => c.sortId === sortId
  );

  if (sortConstructors.length === 0) return null;

  // Prefer terminals at max depth
  const terminals = sortConstructors.filter(c => c.isTerminal);
  const nonTerminals = sortConstructors.filter(c => !c.isTerminal);

  let chosen: Constructor;
  if (currentDepth >= maxDepth && terminals.length > 0) {
    chosen = terminals[Math.floor(Math.random() * terminals.length)];
  } else if (nonTerminals.length > 0 && Math.random() > 0.3) {
    chosen = nonTerminals[Math.floor(Math.random() * nonTerminals.length)];
  } else if (terminals.length > 0) {
    chosen = terminals[Math.floor(Math.random() * terminals.length)];
  } else {
    chosen = sortConstructors[Math.floor(Math.random() * sortConstructors.length)];
  }

  const args: Term[] = [];
  for (const arg of chosen.args) {
    const argTerm = generateRandomTerm(
      arg.sortId,
      constructors,
      sorts,
      maxDepth,
      currentDepth + 1
    );
    if (argTerm) args.push(argTerm);
  }

  return {
    id: uuidv4(),
    constructorId: chosen.id,
    args,
  };
}

// ============================================================================
// Free Variable Analysis
// ============================================================================

export type FreeVariableInfo = {
  name: VariableName;
  sortId: SortId;
  occurrences: string[]; // Term IDs where this variable occurs
};

export function computeFreeVariables(
  term: Term,
  constructors: Map<ConstructorId, Constructor>,
  boundVars: Set<VariableName> = new Set()
): FreeVariableInfo[] {
  if (term.isVariable && term.variableName) {
    if (!boundVars.has(term.variableName)) {
      const constructor = constructors.get(term.constructorId);
      return [{
        name: term.variableName,
        sortId: constructor?.sortId || '',
        occurrences: [term.id],
      }];
    }
    return [];
  }

  const constructor = constructors.get(term.constructorId);
  if (!constructor) return [];

  const freeVars: FreeVariableInfo[] = [];
  let currentBound = new Set(boundVars);

  for (let i = 0; i < term.args.length; i++) {
    const argDef = constructor.args[i];
    const argTerm = term.args[i];

    // Check if this argument introduces a binder
    if (argDef?.isBinder && argTerm.variableName) {
      currentBound = new Set(currentBound);
      currentBound.add(argTerm.variableName);
    }

    // Check if previous binders scope over this argument
    const scopingBinders = constructor.args
      .filter((a, j) => j < i && a.isBinder && a.bindsIn?.includes(argDef?.id || ''))
      .map((_, j) => term.args[j]?.variableName)
      .filter((v): v is string => !!v);

    const argBound = new Set([...currentBound, ...scopingBinders]);
    const argFreeVars = computeFreeVariables(argTerm, constructors, argBound);
    freeVars.push(...argFreeVars);
  }

  // Merge occurrences for same variable
  const merged = new Map<VariableName, FreeVariableInfo>();
  for (const fv of freeVars) {
    const existing = merged.get(fv.name);
    if (existing) {
      existing.occurrences.push(...fv.occurrences);
    } else {
      merged.set(fv.name, { ...fv });
    }
  }

  return Array.from(merged.values());
}

export function isClosed(
  term: Term,
  constructors: Map<ConstructorId, Constructor>
): boolean {
  return computeFreeVariables(term, constructors).length === 0;
}

// ============================================================================
// Syntax-Directed Analysis Implementation
// ============================================================================

export function analyzesSyntaxDirected(
  judgment: Judgment,
  rules: InferenceRule[],
  _constructors: Map<ConstructorId, Constructor>
): SyntaxDirectedAnalysis {
  const relevantRules = rules.filter(r => r.conclusion.judgmentId === judgment.id);
  const overlaps: OverlapInfo[] = [];

  for (let i = 0; i < relevantRules.length; i++) {
    for (let j = i + 1; j < relevantRules.length; j++) {
      const rule1 = relevantRules[i];
      const rule2 = relevantRules[j];

      // Check each argument position in the conclusion
      for (let pos = 0; pos < rule1.conclusion.args.length; pos++) {
        const pattern1 = rule1.conclusion.args[pos];
        const pattern2 = rule2.conclusion.args[pos];

        if (patternsCanOverlap(pattern1, pattern2)) {
          overlaps.push({
            rule1Id: rule1.id,
            rule2Id: rule2.id,
            overlappingPosition: pos,
            description: `Rules "${rule1.name}" and "${rule2.name}" can both match at position ${pos}`,
          });
        }
      }
    }
  }

  return {
    isSyntaxDirected: overlaps.length === 0,
    overlaps,
  };
}

function patternsCanOverlap(p1: Pattern, p2: Pattern): boolean {
  // If either is a meta-variable, they can overlap
  if (p1.metaVariableId || p2.metaVariableId) {
    return true;
  }

  // If both are constructor patterns with different constructors, no overlap
  if (p1.constructorId && p2.constructorId && p1.constructorId !== p2.constructorId) {
    return false;
  }

  // Same constructor - check args recursively
  if (p1.constructorId === p2.constructorId) {
    // They overlap unless some arg position definitively doesn't
    for (let i = 0; i < Math.min(p1.args.length, p2.args.length); i++) {
      if (!patternsCanOverlap(p1.args[i], p2.args[i])) {
        return false;
      }
    }
    return true;
  }

  return true;
}


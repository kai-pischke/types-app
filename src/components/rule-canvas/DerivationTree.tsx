import { generateDefaultSeparators } from '../../types/syntax';
import type { Derivation, Term } from '../../types/syntax';

interface DerivationTreeProps {
  derivation: Derivation;
  judgments: Map<string, { name: string; symbol: string; separators?: string[] }>;
  constructors: Map<string, { name: string }>;
  renderTermString: (term: Term) => string;
}

export function DerivationTree({
  derivation,
  judgments,
  constructors,
  renderTermString,
}: DerivationTreeProps) {
  const judgment = judgments.get(derivation.conclusion.judgmentId);
  if (!judgment) return null;

  const separators = judgment.separators || generateDefaultSeparators(derivation.conclusion.terms.length, judgment.symbol);
  
  const conclusionStr = derivation.conclusion.terms.map((t, i) => 
    `${separators[i]}${renderTermString(t)}`
  ).join('') + (separators[derivation.conclusion.terms.length] || '');

  return (
    <div className="derivation-node">
      {derivation.premises.length > 0 && (
        <div className="derivation-premises">
          {derivation.premises.map((premise, i) => (
            <DerivationTree
              key={i}
              derivation={premise}
              judgments={judgments}
              constructors={constructors}
              renderTermString={renderTermString}
            />
          ))}
        </div>
      )}
      <div className="derivation-inference">
        <div className="inference-line" />
        <span className="rule-name">{derivation.ruleName}</span>
      </div>
      <div className="derivation-conclusion">
        <span className="conclusion-text">{conclusionStr}</span>
      </div>
    </div>
  );
}


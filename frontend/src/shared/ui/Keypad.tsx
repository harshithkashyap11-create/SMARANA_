interface KeypadProps {
  backspaceLabel: string;
  disabled?: boolean;
  label: string;
  onBackspace: () => void;
  onDigit: (digit: string) => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Keypad({
  backspaceLabel,
  disabled = false,
  label,
  onBackspace,
  onDigit,
}: KeypadProps) {
  const digitButton = (digit: string) => (
    <button
      aria-label={digit}
      className="min-h-touch rounded-card border-2 border-primary bg-surface text-2xl font-bold text-text"
      disabled={disabled}
      key={digit}
      type="button"
      onClick={() => onDigit(digit)}
    >
      {digit}
    </button>
  );

  return (
    <div aria-label={label} className="grid grid-cols-3 gap-3" role="group">
      {DIGITS.map(digitButton)}
      <span aria-hidden="true" />
      {digitButton("0")}
      <button
        aria-label={backspaceLabel}
        className="min-h-touch rounded-card border-2 border-primary bg-surface text-2xl font-bold text-text"
        disabled={disabled}
        type="button"
        onClick={onBackspace}
      >
        ⌫
      </button>
    </div>
  );
}

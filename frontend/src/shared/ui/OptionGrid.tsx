export interface QuizOption { label: string; photoUrl?: string | null }

export function OptionGrid({ options, onChoose }: { options: QuizOption[]; onChoose: (option: QuizOption) => void }) {
  return <div className="grid grid-cols-2 gap-3">{options.map((option) => <button className="min-h-touch rounded-card border-2 border-primary bg-surface p-4 text-xl font-bold" key={option.label} type="button" onClick={() => onChoose(option)}>{option.photoUrl ? <img alt="" className="mx-auto mb-2 h-24 w-24 rounded-full object-cover" src={option.photoUrl} /> : null}{option.label}</button>)}</div>;
}

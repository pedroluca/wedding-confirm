type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`cursor-pointer flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
        checked ? 'border-lilac-500 bg-lilac-100/60 shadow-sm' : 'border-lilac-200 bg-white'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          checked ? 'border-lilac-500 bg-lilac-500' : 'border-lilac-300 bg-white'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M4 10.5l3.5 3.5L16 6"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="font-medium text-[#3f3450]">{label}</span>
    </button>
  )
}

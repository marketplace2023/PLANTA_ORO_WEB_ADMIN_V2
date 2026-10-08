type Props = {
  legend: string
  options: Array<{ value: string; label: string }>
  value: string[]
  onChange: (value: string[]) => void
  help?: string
}

/** Selección múltiple como grupo de casillas (etapas, redes). */
export function CheckGroup({ legend, options, value, onChange, help }: Props) {
  const toggle = (v: string, on: boolean) => onChange(on ? [...value, v] : value.filter((x) => x !== v))
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--fur-navy-900)]" checked={value.includes(o.value)} onChange={(e) => toggle(o.value, e.target.checked)} />
            {o.label}
          </label>
        ))}
      </div>
      {help && <p className="text-xs text-fur-gray-600">{help}</p>}
    </fieldset>
  )
}

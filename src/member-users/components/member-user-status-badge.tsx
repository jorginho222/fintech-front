export function MemberUserStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400'
      }`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

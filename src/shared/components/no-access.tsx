import { Link } from 'react-router-dom'

export function NoAccess() {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40">
      <h1 className="text-xl font-semibold tracking-tight text-slate-100">Sin acceso</h1>
      <p role="alert" className="mt-2 text-sm text-slate-400">
        No tiene permiso para ver esta sección. Si lo necesita, solicítelo al administrador de su empresa.
      </p>
      <Link to="/dashboard" className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
        Volver al dashboard
      </Link>
    </div>
  )
}

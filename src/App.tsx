import { useState, useEffect } from 'react'
import RouteOptimizer from './components/RouteOptimizer'
import DayGrouper from './components/DayGrouper'

type Tab = 'optimizer' | 'grouper'

export default function App() {
  const [tab, setTab] = useState<Tab>('optimizer')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ors_api_key') ?? '')

  useEffect(() => {
    localStorage.setItem('ors_api_key', apiKey)
  }, [apiKey])

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="flex-none bg-slate-800 text-white px-5 py-3 flex items-center gap-4 shadow-md">
        <h1 className="text-lg font-bold tracking-tight">Route Optimizer</h1>

        <nav className="flex gap-1 ml-4">
          {(['optimizer', 'grouper'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t === 'optimizer' ? 'Route Optimizer' : 'Day Grouper'}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <label className="text-sm text-slate-400 whitespace-nowrap">ORS API Key <span className="text-slate-500">(local dev only)</span></label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Paste your key here"
            className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded border border-slate-600 focus:outline-none focus:border-blue-400 w-60"
          />
          <a
            href="https://openrouteservice.org/dev/#/signup"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 underline whitespace-nowrap"
          >
            Get free key
          </a>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {tab === 'optimizer' ? (
          <RouteOptimizer apiKey={apiKey} />
        ) : (
          <DayGrouper apiKey={apiKey} />
        )}
      </main>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react';

interface SingularityTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Direction = 'up' | 'down';

interface Benchmark {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  formula: string;
  direction: Direction;
  value: number;
  target: number;
  unit: string;
  weight: number;
  confidence: number;
  source: string;
  lastUpdated: string | null;
}

interface Snapshot {
  id: string;
  createdAt: string;
  score: number;
  label: string;
}

interface StoredState {
  benchmarks: Benchmark[];
  snapshots: Snapshot[];
}

const STORAGE_KEY = 'dakibwa_singularity_tracker_v2';
const MAX_SNAPSHOTS = 64;

const DEFAULT_BENCHMARKS: Benchmark[] = [
  {
    id: 'gdpval',
    code: 'GDPVal',
    name: 'AI-Attributed GDP Value Share',
    category: 'Macro Impact',
    description: 'Share of real GDP attributable to AI-enabled output and productivity.',
    formula: 'GDPVal = (AI-attributed value added / real GDP) * 100',
    direction: 'up',
    value: 2.8,
    target: 18,
    unit: '%',
    weight: 10,
    confidence: 72,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'rli',
    code: 'RLI',
    name: 'Routine Labor Index Automated',
    category: 'Labor Automation',
    description: 'Share of routine white-collar tasks automated at or above human median quality.',
    formula: 'RLI = (automated routine task-hours / total routine task-hours) * 100',
    direction: 'up',
    value: 23,
    target: 80,
    unit: '%',
    weight: 10,
    confidence: 74,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'wha',
    code: 'WHA',
    name: 'White-Collar Hours Automated',
    category: 'Labor Automation',
    description: 'Share of total white-collar work-hours executed by software agents with minimal supervision.',
    formula: 'WHA = (agent-executed white-collar hours / total white-collar hours) * 100',
    direction: 'up',
    value: 14,
    target: 70,
    unit: '%',
    weight: 9,
    confidence: 68,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'cefh',
    code: 'CEFH',
    name: 'Cost per Equivalent Full-Time Hour',
    category: 'Economics',
    description: 'Blended cost for AI systems to deliver one equivalent hour of white-collar work.',
    formula: 'CEFH = total AI operating cost / equivalent automated labor hours',
    direction: 'down',
    value: 21,
    target: 7,
    unit: 'USD/hr',
    weight: 10,
    confidence: 70,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'hhr',
    code: 'HHR',
    name: 'Human Handoff Rate',
    category: 'Reliability',
    description: 'Share of tasks initiated as AI-first that escalate to human workers.',
    formula: 'HHR = (AI-started tasks requiring human handoff / total AI-started tasks) * 100',
    direction: 'down',
    value: 42,
    target: 12,
    unit: '%',
    weight: 9,
    confidence: 75,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'qcr',
    code: 'QCR',
    name: 'Quality Compliance Rate (Regulated Work)',
    category: 'Reliability',
    description: 'Pass rate for legal, finance, and healthcare workflows under audit constraints.',
    formula: 'QCR = (AI outputs passing formal QA/audit / total audited AI outputs) * 100',
    direction: 'up',
    value: 37,
    target: 92,
    unit: '%',
    weight: 9,
    confidence: 66,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'ead',
    code: 'EAD',
    name: 'Enterprise Agent Deployment',
    category: 'Adoption',
    description: 'Share of mid/large firms running AI agents in core workflows (ops, finance, support, legal, sales).',
    formula: 'EAD = (firms with AI agents in >=3 core functions / total firms sampled) * 100',
    direction: 'up',
    value: 21,
    target: 65,
    unit: '%',
    weight: 7,
    confidence: 64,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'rpi',
    code: 'RPI',
    name: 'Regulatory Permission Index',
    category: 'Adoption',
    description: 'Coverage of high-value workflows where policy permits AI-first execution.',
    formula: 'RPI = (permitted AI-first workflow classes / tracked workflow classes) * 100',
    direction: 'up',
    value: 24,
    target: 75,
    unit: '%',
    weight: 7,
    confidence: 58,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'wcls',
    code: 'WCLS',
    name: 'White-Collar Labor Share per Output Unit',
    category: 'Labor Efficiency',
    description: 'White-collar labor-hours required to produce one normalized unit of real output.',
    formula: 'WCLS = white-collar labor-hours / normalized real output units',
    direction: 'down',
    value: 0.84,
    target: 0.35,
    unit: 'hours/unit',
    weight: 9,
    confidence: 67,
    source: '',
    lastUpdated: null,
  },
  {
    id: 'odp',
    code: 'ODP',
    name: 'Occupational Displacement Pressure',
    category: 'Labor Market',
    description: 'Gap between unemployment rates in highly automatable vs low-automatable white-collar occupations.',
    formula: 'ODP = unemployment(high-automation occupations) - unemployment(low-automation occupations)',
    direction: 'up',
    value: 0.8,
    target: 4,
    unit: '%',
    weight: 6,
    confidence: 54,
    source: '',
    lastUpdated: null,
  },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const getBenchmarkProgress = (benchmark: Benchmark): number => {
  const { value, target, direction } = benchmark;

  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  if (direction === 'up') {
    return clamp(value / target);
  }

  if (value <= 0) {
    return 1;
  }

  return clamp(target / value);
};

const getStatusLabel = (score: number): { label: string; color: string } => {
  if (score >= 85) return { label: 'Near Full White-Collar Automation', color: 'text-[#2f7a47]' };
  if (score >= 70) return { label: 'Broad Automation Phase', color: 'text-[#2d6f89]' };
  if (score >= 50) return { label: 'Transition Phase', color: 'text-[#8a5d23]' };
  return { label: 'Early Automation Phase', color: 'text-[#9a3c2b]' };
};

const parseStoredState = (raw: string | null): StoredState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!Array.isArray(parsed.benchmarks) || !Array.isArray(parsed.snapshots)) return null;
    return {
      benchmarks: parsed.benchmarks as Benchmark[],
      snapshots: parsed.snapshots as Snapshot[],
    };
  } catch {
    return null;
  }
};

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
};

const SingularityTracker: React.FC<SingularityTrackerProps> = ({ isOpen, onClose }) => {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>(DEFAULT_BENCHMARKS);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState('');

  useEffect(() => {
    const stored = parseStoredState(localStorage.getItem(STORAGE_KEY));
    if (!stored) return;

    if (stored.benchmarks.length > 0) {
      setBenchmarks(stored.benchmarks);
    }
    if (stored.snapshots.length > 0) {
      setSnapshots(stored.snapshots);
    }
  }, []);

  useEffect(() => {
    const state: StoredState = { benchmarks, snapshots };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [benchmarks, snapshots]);

  const scoredBenchmarks = useMemo(() => {
    return benchmarks.map((benchmark) => {
      const progress = getBenchmarkProgress(benchmark);
      const effectiveWeight = benchmark.weight * (benchmark.confidence / 100);
      return {
        ...benchmark,
        progress,
        effectiveWeight,
        weightedProgress: progress * effectiveWeight,
      };
    });
  }, [benchmarks]);

  const automationScore = useMemo(() => {
    const denominator = scoredBenchmarks.reduce((sum, item) => sum + item.effectiveWeight, 0);
    if (denominator <= 0) return 0;
    const numerator = scoredBenchmarks.reduce((sum, item) => sum + item.weightedProgress, 0);
    return Math.round((numerator / denominator) * 100);
  }, [scoredBenchmarks]);

  const status = getStatusLabel(automationScore);

  const latestSnapshot = snapshots[0] ?? null;
  const deltaFromLatest = latestSnapshot ? automationScore - latestSnapshot.score : null;

  const bottlenecks = useMemo(() => {
    return [...scoredBenchmarks]
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 3);
  }, [scoredBenchmarks]);

  const updateBenchmark = (id: string, updater: (existing: Benchmark) => Benchmark) => {
    setBenchmarks((previous) => previous.map((item) => (item.id === id ? updater(item) : item)));
  };

  const setNumericField = (id: string, field: keyof Pick<Benchmark, 'value' | 'target' | 'weight' | 'confidence'>, raw: string) => {
    const parsed = Number.parseFloat(raw);
    updateBenchmark(id, (existing) => ({
      ...existing,
      [field]: Number.isFinite(parsed) ? parsed : 0,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const setTextField = (id: string, field: keyof Pick<Benchmark, 'source'>, value: string) => {
    updateBenchmark(id, (existing) => ({
      ...existing,
      [field]: value,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const captureSnapshot = () => {
    const label = snapshotLabel.trim() || 'Checkpoint';
    const next: Snapshot = {
      id: `snapshot-${Date.now()}`,
      createdAt: new Date().toISOString(),
      score: automationScore,
      label,
    };
    setSnapshots((previous) => [next, ...previous].slice(0, MAX_SNAPSHOTS));
    setSnapshotLabel('');
  };

  const exportState = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      score: automationScore,
      status: status.label,
      benchmarks,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `singularity-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (!window.confirm('Reset all benchmarks and snapshots to defaults?')) return;
    setBenchmarks(DEFAULT_BENCHMARKS);
    setSnapshots([]);
    setSnapshotLabel('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-[#f7f4ed] dark:bg-[#15120d] text-[#1d1b17] dark:text-[#ece5d8] overflow-y-auto">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 space-y-5">
        <header className="surface-panel rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
            >
              Back
            </button>
            <div className="text-right">
              <h1 className="font-display text-2xl md:text-3xl tracking-tight">White-Collar Automation Tracker</h1>
              <p className="text-xs md:text-sm text-[#696257] dark:text-[#a89d88]">
                Build your own benchmark model for automation progress
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Core Metrics</p>
            <p className="text-sm text-[#696257] dark:text-[#a89d88] mt-1">
              <strong>GDPVal</strong> measures AI-attributed GDP value share. <strong>RLI</strong> measures the share of routine white-collar task-hours automated at human-equivalent quality.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Automation Score</p>
              <p className="font-display text-4xl mt-1">{automationScore}</p>
              <p className={`text-sm mt-1 ${status.color}`}>{status.label}</p>
            </div>
            <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Delta Vs Last Snapshot</p>
              <p className="font-display text-4xl mt-1">
                {deltaFromLatest === null ? 'n/a' : `${deltaFromLatest >= 0 ? '+' : ''}${deltaFromLatest}`}
              </p>
              <p className="text-sm mt-1 text-[#696257] dark:text-[#a89d88]">
                {latestSnapshot ? `${latestSnapshot.label} · ${new Date(latestSnapshot.createdAt).toLocaleDateString()}` : 'No snapshots yet'}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Checkpoint</p>
              <input
                type="text"
                value={snapshotLabel}
                onChange={(event) => setSnapshotLabel(event.target.value)}
                placeholder="e.g. Feb benchmark refresh"
                className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent text-sm outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
              />
              <div className="flex gap-2">
                <button
                  onClick={captureSnapshot}
                  className="px-3 py-2 text-xs rounded-lg border border-[#d8cfbe] dark:border-[#342f25] hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
                >
                  Save Snapshot
                </button>
                <button
                  onClick={exportState}
                  className="px-3 py-2 text-xs rounded-lg border border-[#d8cfbe] dark:border-[#342f25] hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
                >
                  Export JSON
                </button>
                <button
                  onClick={resetAll}
                  className="px-3 py-2 text-xs rounded-lg border border-[#d8cfbe] dark:border-[#342f25] hover:border-[#9e4230] hover:text-[#9e4230] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3">
          <h2 className="font-display text-2xl tracking-tight">Bottlenecks To Watch</h2>
          <p className="text-sm text-[#696257] dark:text-[#a89d88]">
            Lowest progress benchmarks weighted by your current assumptions.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {bottlenecks.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 space-y-2">
                <p className="text-sm uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">{item.code} · {item.category}</p>
                <h3 className="text-base">{item.name}</h3>
                <div className="h-2 rounded-full bg-[#d8cfbe] dark:bg-[#342f25] overflow-hidden">
                  <div className="h-full bg-[#205c5a] dark:bg-[#79b7ab]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </div>
                <p className="text-xs text-[#696257] dark:text-[#a89d88]">
                  Progress: {Math.round(item.progress * 100)}%
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3 pb-12">
          <h2 className="font-display text-2xl tracking-tight">Benchmarks</h2>
          <p className="text-sm text-[#696257] dark:text-[#a89d88]">
            Tune values, targets, weights, and confidence to match your model.
          </p>

          <div className="space-y-4">
            {scoredBenchmarks.map((benchmark) => (
              <article key={benchmark.id} className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
                      {benchmark.code} · {benchmark.category} · {benchmark.direction === 'up' ? 'Higher is better' : 'Lower is better'}
                    </p>
                    <h3 className="text-lg">{benchmark.name}</h3>
                    <p className="text-sm text-[#696257] dark:text-[#a89d88] max-w-3xl">{benchmark.description}</p>
                    <p className="text-xs text-[#8a8378] dark:text-[#8f8575] mt-1">
                      {benchmark.formula}
                    </p>
                  </div>
                  <div className="text-sm text-[#696257] dark:text-[#a89d88] md:text-right">
                    <div>Progress: {Math.round(benchmark.progress * 100)}%</div>
                    <div>Effective weight: {benchmark.effectiveWeight.toFixed(1)}</div>
                    <div>Updated: {formatTimestamp(benchmark.lastUpdated)}</div>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-[#d8cfbe] dark:bg-[#342f25] overflow-hidden">
                  <div className="h-full bg-[#205c5a] dark:bg-[#79b7ab]" style={{ width: `${Math.round(benchmark.progress * 100)}%` }} />
                </div>

                <div className="grid md:grid-cols-6 gap-3">
                  <label className="text-sm space-y-1">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">Current</span>
                    <input
                      type="number"
                      step="0.1"
                      value={benchmark.value}
                      onChange={(event) => setNumericField(benchmark.id, 'value', event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">Target</span>
                    <input
                      type="number"
                      step="0.1"
                      value={benchmark.target}
                      onChange={(event) => setNumericField(benchmark.id, 'target', event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">Unit</span>
                    <input
                      type="text"
                      value={benchmark.unit}
                      onChange={(event) =>
                        updateBenchmark(benchmark.id, (existing) => ({
                          ...existing,
                          unit: event.target.value,
                          lastUpdated: new Date().toISOString(),
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">Weight (1-10)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={benchmark.weight}
                      onChange={(event) => setNumericField(benchmark.id, 'weight', event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">Confidence (0-100)</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={benchmark.confidence}
                      onChange={(event) => setNumericField(benchmark.id, 'confidence', event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#8a8378] dark:text-[#8f8575]">Source Link</span>
                    <input
                      type="url"
                      value={benchmark.source}
                      onChange={(event) => setTextField(benchmark.id, 'source', event.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3">
          <h2 className="font-display text-2xl tracking-tight">Snapshot History</h2>
          {snapshots.length === 0 && (
            <p className="text-sm text-[#696257] dark:text-[#a89d88]">
              No snapshots yet. Save one whenever you refresh your benchmark inputs.
            </p>
          )}
          {snapshots.length > 0 && (
            <div className="space-y-2">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm">{snapshot.label}</p>
                    <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="font-display text-2xl">{snapshot.score}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SingularityTracker;

import React, { useEffect, useMemo, useState } from 'react';

interface BioDataHubProps {
  isOpen: boolean;
  onClose: () => void;
}

type DataSource = 'circle' | 'cronometer' | 'whoop' | 'randox';
type EntryCategory = 'genomics' | 'nutrition' | 'biometric' | 'lab';

interface NormalizedEntry {
  id: string;
  source: DataSource;
  category: EntryCategory;
  timestamp: string | null;
  metric: string;
  value: number | string | null;
  unit: string | null;
  referenceRange: string | null;
  attributes: Record<string, string>;
}

interface IngestionRecord {
  id: string;
  source: DataSource;
  fileName: string;
  importedAt: string;
  entryCount: number;
  storedEntryCount: number;
  uniqueMetricCount: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
  warnings: string[];
  entries: NormalizedEntry[];
}

interface ParsedTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

interface ParseResult {
  entries: NormalizedEntry[];
  warnings: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'dakibwa_bio_data_hub_v1';
const MAX_PARSED_ENTRIES = 25_000;
const MAX_STORED_ENTRIES = 2_500;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5';

const SOURCE_CONFIG: Record<DataSource, { label: string; description: string; formats: string }> = {
  circle: {
    label: 'Circle Raw DNA',
    description: 'Raw variant files (rsid, chromosome, position, genotype).',
    formats: '.txt, .csv, .tsv',
  },
  cronometer: {
    label: 'Cronometer Nutrition',
    description: 'Nutrition and diary exports with daily macro/micronutrient values.',
    formats: '.csv, .tsv',
  },
  whoop: {
    label: 'Whoop Biometrics',
    description: 'Recovery, strain, sleep, and workout exports.',
    formats: '.json, .csv, .tsv',
  },
  randox: {
    label: 'Randox Blood Tests',
    description: 'Biomarker exports with results, units, and reference ranges.',
    formats: '.csv, .tsv, .json',
  },
};

const detectDelimiter = (line: string): string => {
  const candidates = [',', '\t', ';', '|'];
  let best = ',';
  let bestCount = -1;
  for (const delimiter of candidates) {
    const count = line.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
};

const splitDelimitedLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells.map((cell) => {
    if (cell.startsWith('"') && cell.endsWith('"') && cell.length >= 2) {
      return cell.slice(1, -1).trim();
    }
    return cell;
  });
};

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseDelimited = (text: string): ParsedTable => {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstRow = splitDelimitedLine(lines[0], delimiter);
  const hasHeader = firstRow.some((cell) => /[a-z]/i.test(cell));
  const headers = hasHeader ? firstRow : firstRow.map((_, index) => `column_${index + 1}`);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = dataLines.map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });

  return { headers, rows };
};

const parseMaybeNumber = (value: string): number | null => {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateMaybe = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const titleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const extractMetricAndUnit = (header: string): { metric: string; unit: string | null } => {
  const match = header.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
  if (!match) {
    return { metric: header.trim(), unit: null };
  }
  const metric = match[1].trim();
  const unit = match[2]?.trim() ?? null;
  return { metric, unit };
};

const findHeader = (headers: string[], pattern: RegExp): string | null => {
  const found = headers.find((header) => pattern.test(normalizeKey(header)));
  return found ?? null;
};

const flattenNumericFields = (
  value: unknown,
  prefix = '',
  depth = 0
): Array<{ metric: string; value: number }> => {
  if (depth > 2) return [];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [{ metric: prefix.trim(), value }];
  }
  if (typeof value === 'string') {
    const parsed = parseMaybeNumber(value);
    if (parsed !== null) {
      return [{ metric: prefix.trim(), value: parsed }];
    }
    return [];
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const results: Array<{ metric: string; value: number }> = [];
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix} ${key}` : key;
    results.push(...flattenNumericFields(nested, nextPrefix, depth + 1));
  });
  return results;
};

const parseCircle = (text: string): ParseResult => {
  const table = parseDelimited(text);
  const warnings: string[] = [];
  const entries: NormalizedEntry[] = [];

  if (table.headers.length === 1) {
    const lines = text
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

    let startAt = 0;
    const firstParts = lines[0]?.split(/\s+/) ?? [];
    if (
      firstParts.length >= 4 &&
      firstParts.some((part) => /rsid|chromosome|position|genotype/i.test(part))
    ) {
      startAt = 1;
    }

    lines.slice(startAt).some((line, index) => {
      const parts = line.split(/\s+/);
      if (parts.length < 4) return false;
      const [rsid, chromosome, position, genotype] = parts;
      if (!rsid && !genotype) return false;

      entries.push({
        id: `circle-space-${index}`,
        source: 'circle',
        category: 'genomics',
        timestamp: null,
        metric: rsid || `Variant ${index + 1}`,
        value: genotype || null,
        unit: null,
        referenceRange: null,
        attributes: {
          chromosome: chromosome || '',
          position: position || '',
        },
      });

      if (entries.length >= MAX_PARSED_ENTRIES) {
        warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} variants.`);
        return true;
      }
      return false;
    });

    if (!entries.length) {
      warnings.push('No valid variants were detected in this file.');
    }
    return { entries, warnings };
  }

  const rsidHeader =
    findHeader(table.headers, /rsid|snp|variant|marker/) ?? table.headers[0] ?? null;
  const chromosomeHeader = findHeader(table.headers, /chromosome|chrom|chr/);
  const positionHeader = findHeader(table.headers, /position|pos/);
  const genotypeHeader = findHeader(table.headers, /genotype|allele|result|call/) ?? table.headers[3] ?? null;

  table.rows.some((row, index) => {
    const rsid = rsidHeader ? row[rsidHeader] : '';
    const genotype = genotypeHeader ? row[genotypeHeader] : '';
    const chromosome = chromosomeHeader ? row[chromosomeHeader] : '';
    const position = positionHeader ? row[positionHeader] : '';

    if (!rsid && !genotype) return false;

    entries.push({
      id: `circle-${index}`,
      source: 'circle',
      category: 'genomics',
      timestamp: null,
      metric: rsid || `Variant ${index + 1}`,
      value: genotype || null,
      unit: null,
      referenceRange: null,
      attributes: {
        chromosome: chromosome || '',
        position: position || '',
      },
    });

    if (entries.length >= MAX_PARSED_ENTRIES) {
      warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} variants.`);
      return true;
    }
    return false;
  });

  if (!entries.length) {
    warnings.push('No valid variants were detected in this file.');
  }

  return { entries, warnings };
};

const parseCronometer = (text: string): ParseResult => {
  const table = parseDelimited(text);
  const warnings: string[] = [];
  const entries: NormalizedEntry[] = [];

  const dateHeader = findHeader(table.headers, /date|day|logged/);

  table.rows.some((row, rowIndex) => {
    const timestamp = dateHeader ? parseDateMaybe(row[dateHeader]) : null;
    for (const header of table.headers) {
      if (header === dateHeader) continue;
      const normalized = normalizeKey(header);
      if (/(note|comment|meal|food|serving)/.test(normalized)) continue;

      const value = parseMaybeNumber(row[header]);
      if (value === null) continue;
      const { metric, unit } = extractMetricAndUnit(header);

      entries.push({
        id: `cronometer-${rowIndex}-${header}`,
        source: 'cronometer',
        category: 'nutrition',
        timestamp,
        metric: metric || header,
        value,
        unit,
        referenceRange: null,
        attributes: {},
      });

      if (entries.length >= MAX_PARSED_ENTRIES) {
        warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} nutrition records.`);
        return true;
      }
    }
    return false;
  });

  if (!entries.length) {
    warnings.push('No numeric nutrient values were detected in this file.');
  }

  return { entries, warnings };
};

const collectJsonRecords = (input: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(input)) {
    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }
  if (!input || typeof input !== 'object') return [];

  const root = input as Record<string, unknown>;
  const arrays = Object.values(root).filter((value) => Array.isArray(value)) as unknown[][];
  const nestedObjects = arrays.flat().filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  if (nestedObjects.length) return nestedObjects;
  return [root];
};

const parseWhoop = (text: string, fileName: string): ParseResult => {
  const warnings: string[] = [];
  const entries: NormalizedEntry[] = [];
  const isJson = fileName.toLowerCase().endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[');

  if (isJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { entries: [], warnings: ['Invalid JSON format for Whoop export.'] };
    }

    const records = collectJsonRecords(parsed);
    records.some((record, index) => {
      const timestampField =
        (record.created_at as string) ??
        (record.start as string) ??
        (record.start_time as string) ??
        (record.date as string) ??
        '';
      const timestamp = parseDateMaybe(timestampField);

      const numericFields = flattenNumericFields(record).filter((item) => item.metric);
      for (const field of numericFields) {
        entries.push({
          id: `whoop-${index}-${field.metric}`,
          source: 'whoop',
          category: 'biometric',
          timestamp,
          metric: titleCase(field.metric),
          value: field.value,
          unit: null,
          referenceRange: null,
          attributes: {},
        });
        if (entries.length >= MAX_PARSED_ENTRIES) {
          warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} biometric records.`);
          return true;
        }
      }
      return false;
    });
  } else {
    const table = parseDelimited(text);
    const dateHeader = findHeader(table.headers, /date|start|time|created/);

    table.rows.some((row, rowIndex) => {
      const timestamp = dateHeader ? parseDateMaybe(row[dateHeader]) : null;
      for (const header of table.headers) {
        if (header === dateHeader) continue;
        const value = parseMaybeNumber(row[header]);
        if (value === null) continue;
        const { metric, unit } = extractMetricAndUnit(header);
        entries.push({
          id: `whoop-${rowIndex}-${header}`,
          source: 'whoop',
          category: 'biometric',
          timestamp,
          metric: metric || header,
          value,
          unit,
          referenceRange: null,
          attributes: {},
        });
        if (entries.length >= MAX_PARSED_ENTRIES) {
          warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} biometric records.`);
          return true;
        }
      }
      return false;
    });
  }

  if (!entries.length) {
    warnings.push('No numeric biometrics were detected in this Whoop file.');
  }

  return { entries, warnings };
};

const parseRandox = (text: string, fileName: string): ParseResult => {
  const warnings: string[] = [];
  const entries: NormalizedEntry[] = [];
  const isJson = fileName.toLowerCase().endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[');

  if (isJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { entries: [], warnings: ['Invalid JSON format for Randox export.'] };
    }
    const records = collectJsonRecords(parsed);
    records.some((record, index) => {
      const metricRaw =
        (record.test as string) ??
        (record.marker as string) ??
        (record.biomarker as string) ??
        `Marker ${index + 1}`;
      const valueRaw = record.result ?? record.value ?? null;
      const numeric = typeof valueRaw === 'number' ? valueRaw : parseMaybeNumber(String(valueRaw ?? ''));
      const value: number | string | null = numeric ?? (valueRaw ? String(valueRaw) : null);
      if (value === null) return false;

      const timestampRaw = (record.date as string) ?? (record.collected_at as string) ?? '';
      entries.push({
        id: `randox-json-${index}`,
        source: 'randox',
        category: 'lab',
        timestamp: parseDateMaybe(timestampRaw),
        metric: String(metricRaw),
        value,
        unit: (record.unit as string) ?? null,
        referenceRange: (record.reference_range as string) ?? (record.range as string) ?? null,
        attributes: {},
      });

      if (entries.length >= MAX_PARSED_ENTRIES) {
        warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} lab records.`);
        return true;
      }
      return false;
    });
  } else {
    const table = parseDelimited(text);
    const markerHeader = findHeader(table.headers, /marker|test|analyte|biomarker|parameter/);
    const valueHeader = findHeader(table.headers, /result|value|reading/);
    const unitHeader = findHeader(table.headers, /unit/);
    const rangeHeader = findHeader(table.headers, /range|reference/);
    const dateHeader = findHeader(table.headers, /date|collection|taken/);

    if (markerHeader && valueHeader) {
      table.rows.some((row, rowIndex) => {
        const metric = row[markerHeader] || `Marker ${rowIndex + 1}`;
        const numeric = parseMaybeNumber(row[valueHeader]);
        const value: number | string | null = numeric ?? (row[valueHeader] || null);
        if (value === null) return false;

        entries.push({
          id: `randox-${rowIndex}`,
          source: 'randox',
          category: 'lab',
          timestamp: dateHeader ? parseDateMaybe(row[dateHeader]) : null,
          metric,
          value,
          unit: unitHeader ? row[unitHeader] || null : null,
          referenceRange: rangeHeader ? row[rangeHeader] || null : null,
          attributes: {},
        });

        if (entries.length >= MAX_PARSED_ENTRIES) {
          warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} lab records.`);
          return true;
        }
        return false;
      });
    } else {
      table.rows.some((row, rowIndex) => {
        const timestamp = dateHeader ? parseDateMaybe(row[dateHeader]) : null;
        for (const header of table.headers) {
          if (header === dateHeader) continue;
          const value = parseMaybeNumber(row[header]);
          if (value === null) continue;
          const { metric, unit } = extractMetricAndUnit(header);
          entries.push({
            id: `randox-fallback-${rowIndex}-${header}`,
            source: 'randox',
            category: 'lab',
            timestamp,
            metric,
            value,
            unit,
            referenceRange: null,
            attributes: {},
          });
          if (entries.length >= MAX_PARSED_ENTRIES) {
            warnings.push(`Reached import cap at ${MAX_PARSED_ENTRIES.toLocaleString()} lab records.`);
            return true;
          }
        }
        return false;
      });
    }
  }

  if (!entries.length) {
    warnings.push('No lab values were detected in this Randox file.');
  }

  return { entries, warnings };
};

const parseFileBySource = (source: DataSource, text: string, fileName: string): ParseResult => {
  switch (source) {
    case 'circle':
      return parseCircle(text);
    case 'cronometer':
      return parseCronometer(text);
    case 'whoop':
      return parseWhoop(text, fileName);
    case 'randox':
      return parseRandox(text, fileName);
    default:
      return { entries: [], warnings: ['Unknown source type.'] };
  }
};

const getDateRange = (entries: NormalizedEntry[]): { start: string; end: string } | null => {
  const timestamps = entries
    .map((entry) => entry.timestamp)
    .filter((value): value is string => !!value)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (!timestamps.length) return null;
  return { start: timestamps[0], end: timestamps[timestamps.length - 1] };
};

const CATEGORY_LABELS: Record<EntryCategory, string> = {
  genomics: 'Genomics',
  nutrition: 'Nutrition',
  biometric: 'Biometric',
  lab: 'Lab',
};

const sortByImportedAt = (records: IngestionRecord[]) =>
  [...records].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

const getRecordTags = (record: IngestionRecord): string[] => {
  const tags = new Set<string>();
  const categories = new Set(record.entries.map((entry) => entry.category));
  categories.forEach((category) => tags.add(CATEGORY_LABELS[category]));

  const metricCount: Record<string, number> = {};
  record.entries.forEach((entry) => {
    metricCount[entry.metric] = (metricCount[entry.metric] ?? 0) + 1;
  });

  Object.entries(metricCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([metric]) => tags.add(metric));

  if (record.warnings.length > 0) tags.add('Needs review');
  return Array.from(tags).slice(0, 6);
};

const extractOpenAIText = (payload: any): string => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
      if (part?.type === 'text' && typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return '';
};

const requestOpenAI = async (systemPrompt: string, messages: ChatMessage[], maxOutputTokens = 1600) => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_output_tokens: maxOutputTokens,
      input: [
        { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
        ...messages.map((message) => ({
          role: message.role,
          content: [{ type: 'text', text: message.content }],
        })),
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `OpenAI request failed (${response.status})`);
  }

  const payload = await response.json();
  const text = extractOpenAIText(payload);
  if (!text) throw new Error('OpenAI returned an empty response.');
  return text;
};

const buildDataDigest = (records: IngestionRecord[]) => {
  const sortedRecords = sortByImportedAt(records);
  const sourceOverview = (Object.keys(SOURCE_CONFIG) as DataSource[]).map((source) => {
    const sourceRecords = sortedRecords.filter((record) => record.source === source);
    return {
      source,
      datasets: sourceRecords.length,
      latestImport: sourceRecords[0]?.importedAt ?? null,
      parsedEntries: sourceRecords.reduce((sum, record) => sum + record.entryCount, 0),
    };
  });

  const metricStats = new Map<
    string,
    { count: number; min: number; max: number; sum: number; sources: Set<DataSource>; units: Set<string> }
  >();
  sortedRecords.forEach((record) => {
    record.entries.forEach((entry) => {
      if (typeof entry.value !== 'number' || !Number.isFinite(entry.value)) return;
      const existing =
        metricStats.get(entry.metric) ??
        {
          count: 0,
          min: entry.value,
          max: entry.value,
          sum: 0,
          sources: new Set<DataSource>(),
          units: new Set<string>(),
        };
      existing.count += 1;
      existing.min = Math.min(existing.min, entry.value);
      existing.max = Math.max(existing.max, entry.value);
      existing.sum += entry.value;
      existing.sources.add(entry.source);
      if (entry.unit) existing.units.add(entry.unit);
      metricStats.set(entry.metric, existing);
    });
  });

  const numericMetrics = Array.from(metricStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 80)
    .map(([metric, stats]) => ({
      metric,
      count: stats.count,
      avg: Number((stats.sum / stats.count).toFixed(3)),
      min: Number(stats.min.toFixed(3)),
      max: Number(stats.max.toFixed(3)),
      sources: Array.from(stats.sources),
      units: Array.from(stats.units),
    }));

  const files = sortedRecords.slice(0, 50).map((record) => ({
    source: record.source,
    fileName: record.fileName,
    importedAt: record.importedAt,
    parsedEntries: record.entryCount,
    uniqueMetrics: record.uniqueMetricCount,
    tags: getRecordTags(record),
    dateRange: record.dateRange,
    warnings: record.warnings,
  }));

  const sampleEntries = sortedRecords
    .flatMap((record) =>
      record.entries.slice(0, 20).map((entry) => ({
        source: entry.source,
        category: entry.category,
        metric: entry.metric,
        value: entry.value,
        unit: entry.unit,
        timestamp: entry.timestamp,
        fileName: record.fileName,
      }))
    )
    .slice(0, 120);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      datasets: sortedRecords.length,
      parsedEntries: sortedRecords.reduce((sum, record) => sum + record.entryCount, 0),
      storedEntries: sortedRecords.reduce((sum, record) => sum + record.storedEntryCount, 0),
    },
    sources: sourceOverview,
    files,
    numericMetrics,
    sampleEntries,
  };
};

const BioDataHub: React.FC<BioDataHubProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [activeUploadSource, setActiveUploadSource] = useState<DataSource | null>(null);
  const [expandedSource, setExpandedSource] = useState<DataSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'running' | 'ready' | 'error'>('idle');
  const [analysisText, setAnalysisText] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisDirty, setAnalysisDirty] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as IngestionRecord[];
      if (!Array.isArray(parsed)) return;
      setRecords(parsed);
    } catch {
      setError('Stored ingestion history could not be loaded.');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      setError('Could not persist all records locally. Try exporting then clearing old data.');
    }
  }, [records]);

  const sortedRecords = useMemo(() => sortByImportedAt(records), [records]);

  const recordsBySource = useMemo(() => {
    const grouped: Record<DataSource, IngestionRecord[]> = {
      circle: [],
      cronometer: [],
      whoop: [],
      randox: [],
    };
    sortedRecords.forEach((record) => {
      grouped[record.source].push(record);
    });
    return grouped;
  }, [sortedRecords]);

  const dataDigest = useMemo(() => buildDataDigest(sortedRecords), [sortedRecords]);
  const digestJson = useMemo(() => JSON.stringify(dataDigest), [dataDigest]);

  useEffect(() => {
    if (!analysisDirty) return;
    let cancelled = false;

    const run = async () => {
      if (!records.length) {
        if (!cancelled) {
          setAnalysisStatus('error');
          setAnalysisError('Upload at least one file before running analysis.');
          setAnalysisDirty(false);
        }
        return;
      }

      if (!OPENAI_API_KEY) {
        if (!cancelled) {
          setAnalysisStatus('error');
          setAnalysisError('Set VITE_OPENAI_API_KEY to run GPT analysis.');
          setAnalysisDirty(false);
        }
        return;
      }

      setAnalysisStatus('running');
      setAnalysisError(null);

      try {
        const systemPrompt = [
          'You are an expert quantitative health analyst.',
          'You receive merged personal data from DNA, nutrition, biometrics, and blood tests.',
          'Find plausible cross-domain correlations and patterns.',
          'State confidence level (high/medium/low) for each point.',
          'Do not diagnose or prescribe.',
          'Give concise bullet points under: Signals, Correlations, Follow-up tests.',
        ].join('\n');

        const text = await requestOpenAI(systemPrompt, [
          {
            role: 'user',
            content: `Analyse this dataset and find interesting correlations:\n${digestJson}`,
          },
        ]);

        if (cancelled) return;
        setAnalysisText(text);
        setAnalysisStatus('ready');
      } catch (analysisRequestError) {
        if (cancelled) return;
        setAnalysisStatus('error');
        setAnalysisError(
          analysisRequestError instanceof Error
            ? analysisRequestError.message
            : 'Analysis failed for an unknown reason.'
        );
      } finally {
        if (!cancelled) setAnalysisDirty(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [analysisDirty, digestJson, records.length]);

  const handleUpload = async (source: DataSource, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setActiveUploadSource(source);

    try {
      const text = await file.text();
      const result = parseFileBySource(source, text, file.name);
      const dateRange = getDateRange(result.entries);
      const uniqueMetricCount = new Set(result.entries.map((entry) => entry.metric)).size;
      const storedEntries = result.entries.slice(0, MAX_STORED_ENTRIES);
      const warnings = [...result.warnings];
      if (result.entries.length > MAX_STORED_ENTRIES) {
        warnings.push(
          `Stored only the first ${MAX_STORED_ENTRIES.toLocaleString()} records in browser storage.`
        );
      }

      const record: IngestionRecord = {
        id: `${source}-${Date.now()}`,
        source,
        fileName: file.name,
        importedAt: new Date().toISOString(),
        entryCount: result.entries.length,
        storedEntryCount: storedEntries.length,
        uniqueMetricCount,
        dateRange,
        warnings,
        entries: storedEntries,
      };

      setRecords((previous) => [record, ...previous]);
      setExpandedSource(source);
      setAnalysisDirty(true);
      if (!result.entries.length) {
        setError('Upload finished, but this file had no parsable records.');
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? `Upload failed: ${uploadError.message}`
          : 'Upload failed due to an unknown parsing error.'
      );
    } finally {
      setActiveUploadSource(null);
    }
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bio-data-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!window.confirm('Delete all uploaded data from this browser?')) return;
    setRecords([]);
    setExpandedSource(null);
    setError(null);
    setAnalysisText('');
    setAnalysisStatus('idle');
    setAnalysisError(null);
    setChatMessages([]);
    setChatError(null);
  };

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question) return;

    if (!records.length) {
      setChatError('Upload data first so chat can reference your files.');
      return;
    }
    if (!OPENAI_API_KEY) {
      setChatError('Set VITE_OPENAI_API_KEY to use chat.');
      return;
    }

    const nextMessages = [...chatMessages, { role: 'user', content: question } as ChatMessage];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const systemPrompt = [
        'You are a data assistant for personal health data.',
        'Only use the provided dataset context.',
        'If data is missing, say what is missing.',
        'Be concise and cite which source the insight came from.',
        `Dataset context JSON: ${digestJson}`,
      ].join('\n');

      const assistantText = await requestOpenAI(systemPrompt, nextMessages.slice(-10), 1200);
      setChatMessages([...nextMessages, { role: 'assistant', content: assistantText }]);
    } catch (chatRequestError) {
      setChatError(
        chatRequestError instanceof Error ? chatRequestError.message : 'Chat request failed unexpectedly.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#f7f4ed] dark:bg-[#15120d] text-[#1d1b17] dark:text-[#ece5d8] overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 space-y-5">
        <header className="surface-panel rounded-2xl p-5 md:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
            >
              Back
            </button>
            <div className="text-right">
              <h1 className="font-display text-2xl md:text-3xl tracking-tight">Data Upload + Analysis</h1>
              <p className="text-xs md:text-sm text-[#696257] dark:text-[#a89d88]">
                Model: {OPENAI_MODEL}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={records.length === 0}
              className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
            >
              Export
            </button>
            <button
              onClick={handleClear}
              disabled={records.length === 0}
              className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#9e4230] hover:text-[#9e4230] transition-colors"
            >
              Clear
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-[#c45946] bg-[#c45946]/10 p-4 text-sm text-[#8f2e22] dark:text-[#ffc7bf]">
            {error}
          </div>
        )}

        <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3">
          <h2 className="font-display text-2xl tracking-tight">Upload Sources</h2>
          <p className="text-sm text-[#696257] dark:text-[#a89d88]">
            Grey circle means no upload yet. Green circle with a tick means uploaded.
          </p>

          <div className="space-y-3">
            {(Object.keys(SOURCE_CONFIG) as DataSource[]).map((source) => {
              const config = SOURCE_CONFIG[source];
              const sourceRecords = recordsBySource[source];
              const isComplete = sourceRecords.length > 0;
              const isUploading = activeUploadSource === source;

              return (
                <div
                  key={source}
                  className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        isComplete
                          ? 'bg-[#99c4a8] border-[#99c4a8] text-[#193b2a]'
                          : 'bg-transparent border-[#bcb5a8] text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <div>
                      <div className="text-sm md:text-base">{config.label}</div>
                      <div className="text-xs text-[#8a8378] dark:text-[#8f8575]">Accepted: {config.formats}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedSource(expandedSource === source ? null : source)}
                      disabled={!isComplete}
                      className="px-3 py-2 text-xs rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
                    >
                      View files ({sourceRecords.length})
                    </button>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] cursor-pointer hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors">
                      <span className="text-xs">{isUploading ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".txt,.csv,.tsv,.json"
                        className="hidden"
                        disabled={!!activeUploadSource}
                        onChange={(event) => handleUpload(source, event)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {expandedSource && (
          <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3">
            <h3 className="font-display text-2xl tracking-tight">
              Uploaded Files: {SOURCE_CONFIG[expandedSource].label}
            </h3>
            {recordsBySource[expandedSource].length === 0 && (
              <p className="text-sm text-[#696257] dark:text-[#a89d88]">No files uploaded yet.</p>
            )}
            {recordsBySource[expandedSource].map((record) => (
              <div key={record.id} className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <div className="text-sm md:text-base">{record.fileName}</div>
                  <div className="text-xs text-[#8a8378] dark:text-[#8f8575]">
                    {new Date(record.importedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-[#696257] dark:text-[#a89d88]">
                  {record.entryCount.toLocaleString()} parsed · {record.uniqueMetricCount.toLocaleString()} metrics
                </div>
                <div className="flex flex-wrap gap-2">
                  {getRecordTags(record).map((tag) => (
                    <span
                      key={`${record.id}-${tag}`}
                      className="text-xs px-2 py-1 rounded-full border border-[#d8cfbe] dark:border-[#342f25]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl tracking-tight">GPT Correlation Scan</h3>
            <button
              onClick={() => setAnalysisDirty(true)}
              disabled={analysisStatus === 'running' || records.length === 0}
              className="px-3 py-2 text-xs rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
            >
              {analysisStatus === 'running' ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
          {analysisError && (
            <div className="rounded-lg border border-[#c45946] bg-[#c45946]/10 p-3 text-sm text-[#8f2e22] dark:text-[#ffc7bf]">
              {analysisError}
            </div>
          )}
          {!analysisText && analysisStatus !== 'running' && (
            <p className="text-sm text-[#696257] dark:text-[#a89d88]">
              Upload files to trigger analysis, or run it manually.
            </p>
          )}
          {analysisStatus === 'running' && (
            <p className="text-sm text-[#696257] dark:text-[#a89d88]">Scanning cross-source correlations...</p>
          )}
          {analysisText && (
            <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 text-sm whitespace-pre-wrap">
              {analysisText}
            </div>
          )}
        </section>

        <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3 pb-10">
          <h3 className="font-display text-2xl tracking-tight">Chat With Your Data</h3>
          {chatError && (
            <div className="rounded-lg border border-[#c45946] bg-[#c45946]/10 p-3 text-sm text-[#8f2e22] dark:text-[#ffc7bf]">
              {chatError}
            </div>
          )}

          <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-3 space-y-3 max-h-72 overflow-y-auto">
            {chatMessages.length === 0 && (
              <p className="text-sm text-[#696257] dark:text-[#a89d88]">
                Ask a question like: "Which patterns between biometrics and blood markers look unusual?"
              </p>
            )}
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`text-sm ${
                  message.role === 'assistant'
                    ? 'text-[#1d1b17] dark:text-[#ece5d8]'
                    : 'text-[#205c5a] dark:text-[#79b7ab]'
                }`}
              >
                <span className="uppercase tracking-[0.1em] text-xs mr-2">
                  {message.role === 'assistant' ? 'Assistant' : 'You'}
                </span>
                <span className="whitespace-pre-wrap">{message.content}</span>
              </div>
            ))}
            {chatLoading && <div className="text-sm text-[#696257] dark:text-[#a89d88]">Thinking...</div>}
          </div>

          <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about your uploaded files"
              className="flex-1 px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent text-sm outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default BioDataHub;

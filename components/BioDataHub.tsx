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

const STORAGE_KEY = 'dakibwa_bio_data_hub_v1';
const MAX_PARSED_ENTRIES = 25_000;
const MAX_STORED_ENTRIES = 2_500;

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

const BioDataHub: React.FC<BioDataHubProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [activeUploadSource, setActiveUploadSource] = useState<DataSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'ingestion' | 'command'>('ingestion');
  const [metricQuery, setMetricQuery] = useState('');

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
      setError('Could not persist all records locally. Try exporting and clearing old data.');
    }
  }, [records]);

  const sourceSummaries = useMemo(() => {
    return (Object.keys(SOURCE_CONFIG) as DataSource[]).map((source) => {
      const sourceRecords = records.filter((record) => record.source === source);
      const parsedEntries = sourceRecords.reduce((sum, record) => sum + record.entryCount, 0);
      const latestRecord = sourceRecords.reduce<IngestionRecord | null>((latest, current) => {
        if (!latest) return current;
        return new Date(current.importedAt).getTime() > new Date(latest.importedAt).getTime()
          ? current
          : latest;
      }, null);

      return {
        source,
        datasetCount: sourceRecords.length,
        parsedEntries,
        latestImportedAt: latestRecord?.importedAt ?? null,
        hasWarnings: sourceRecords.some((record) => record.warnings.length > 0),
      };
    });
  }, [records]);

  const dashboard = useMemo(() => {
    const metricFrequency: Record<string, number> = {};
    const categoryCounts: Record<EntryCategory, number> = {
      genomics: 0,
      nutrition: 0,
      biometric: 0,
      lab: 0,
    };
    let storedEntries = 0;
    let warnings = 0;

    records.forEach((record) => {
      storedEntries += record.storedEntryCount;
      warnings += record.warnings.length;
      record.entries.forEach((entry) => {
        categoryCounts[entry.category] += 1;
        metricFrequency[entry.metric] = (metricFrequency[entry.metric] ?? 0) + 1;
      });
    });

    const totalParsedEntries = records.reduce((sum, record) => sum + record.entryCount, 0);
    const latestImportedAt = records.reduce<string | null>((latest, record) => {
      if (!latest) return record.importedAt;
      return new Date(record.importedAt).getTime() > new Date(latest).getTime() ? record.importedAt : latest;
    }, null);
    const metricsByFrequency = Object.entries(metricFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([metric, count]) => ({ metric, count }));

    return {
      totalParsedEntries,
      storedEntries,
      sourceCoverage: sourceSummaries.filter((summary) => summary.datasetCount > 0).length,
      latestImportedAt,
      warnings,
      categoryCounts,
      uniqueMetrics: metricsByFrequency.length,
      metricsByFrequency,
    };
  }, [records, sourceSummaries]);

  const filteredMetrics = useMemo(() => {
    const query = metricQuery.trim().toLowerCase();
    if (!query) return dashboard.metricsByFrequency.slice(0, 18);
    return dashboard.metricsByFrequency
      .filter((item) => item.metric.toLowerCase().includes(query))
      .slice(0, 24);
  }, [dashboard.metricsByFrequency, metricQuery]);

  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
      .slice(0, 10);
  }, [records]);

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
          `Stored only the first ${MAX_STORED_ENTRIES.toLocaleString()} records in local browser storage.`
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
      setActiveView('command');
      if (!result.entries.length) {
        setError('Upload complete, but no parsable records were found.');
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bio-data-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!window.confirm('Delete all ingestion history from this browser?')) return;
    setRecords([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#f7f4ed] dark:bg-[#15120d] text-[#1d1b17] dark:text-[#ece5d8] overflow-y-auto">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-10 space-y-8">
        <header className="surface-panel rounded-2xl p-6 md:p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.14em] text-[#8a8378] dark:text-[#8f8575]">
                Health Data Hub
              </div>
              <h1 className="font-display text-3xl md:text-5xl tracking-tight leading-[1.06]">
                Ingestion + Command Centre
              </h1>
              <p className="text-sm md:text-base text-[#696257] dark:text-[#a89d88] max-w-3xl">
                Use one view to ingest data, and another to monitor source health, dataset quality, and metric
                coverage across Circle, Cronometer, Whoop, and Randox.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleExport}
                disabled={records.length === 0}
                className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={handleClear}
                disabled={records.length === 0}
                className="px-3 py-2 text-sm rounded-lg border border-[#d8cfbe] dark:border-[#342f25] disabled:opacity-40 hover:border-[#9e4230] hover:text-[#9e4230] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-1">
            <button
              onClick={() => setActiveView('ingestion')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeView === 'ingestion'
                  ? 'bg-[#205c5a] text-[#f2f0e8] dark:bg-[#79b7ab] dark:text-[#1c1a16]'
                  : 'text-[#696257] dark:text-[#a89d88] hover:text-[#205c5a] dark:hover:text-[#79b7ab]'
              }`}
            >
              Ingestion
            </button>
            <button
              onClick={() => setActiveView('command')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeView === 'command'
                  ? 'bg-[#205c5a] text-[#f2f0e8] dark:bg-[#79b7ab] dark:text-[#1c1a16]'
                  : 'text-[#696257] dark:text-[#a89d88] hover:text-[#205c5a] dark:hover:text-[#79b7ab]'
              }`}
            >
              Command Centre
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-[#c45946] bg-[#c45946]/10 p-4 text-sm text-[#8f2e22] dark:text-[#ffc7bf]">
            {error}
          </div>
        )}

        {activeView === 'ingestion' && (
          <div className="space-y-5 pb-8">
            <section className="surface-panel rounded-2xl p-5 md:p-6">
              <h2 className="font-display text-2xl md:text-3xl tracking-tight">Ingestion Method</h2>
              <div className="grid md:grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Step 1</div>
                  <p className="mt-2 text-sm text-[#696257] dark:text-[#a89d88]">Choose one source and upload its latest export file.</p>
                </div>
                <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Step 2</div>
                  <p className="mt-2 text-sm text-[#696257] dark:text-[#a89d88]">Data is normalized in-browser and quality warnings are attached to each dataset.</p>
                </div>
                <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Step 3</div>
                  <p className="mt-2 text-sm text-[#696257] dark:text-[#a89d88]">Switch to Command Centre to inspect coverage and trend-ready metrics.</p>
                </div>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4 md:gap-5">
              {sourceSummaries.map((summary) => {
                const config = SOURCE_CONFIG[summary.source];
                const isUploading = activeUploadSource === summary.source;
                const statusLabel =
                  summary.datasetCount === 0
                    ? 'Not Connected'
                    : summary.hasWarnings
                      ? 'Needs Review'
                      : 'Healthy';
                const statusTone =
                  summary.datasetCount === 0
                    ? 'text-[#8a8378] dark:text-[#8f8575]'
                    : summary.hasWarnings
                      ? 'text-[#8f5e14] dark:text-[#f4deb0]'
                      : 'text-[#205c5a] dark:text-[#79b7ab]';

                return (
                  <article key={summary.source} className="surface-panel rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl tracking-tight">{config.label}</h3>
                        <p className="text-sm text-[#696257] dark:text-[#a89d88]">{config.description}</p>
                      </div>
                      <div className={`text-xs uppercase tracking-[0.12em] ${statusTone}`}>{statusLabel}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Datasets</div>
                        <div className="font-display text-xl mt-1">{summary.datasetCount}</div>
                      </div>
                      <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Parsed</div>
                        <div className="font-display text-xl mt-1">{summary.parsedEntries.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
                      Accepted: {config.formats}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-[#696257] dark:text-[#a89d88]">
                        {summary.latestImportedAt
                          ? `Last import: ${new Date(summary.latestImportedAt).toLocaleString()}`
                          : 'No import yet'}
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] cursor-pointer hover:border-[#205c5a] dark:hover:border-[#79b7ab] transition-colors">
                        <span className="text-sm">{isUploading ? 'Parsing...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept=".txt,.csv,.tsv,.json"
                          className="hidden"
                          disabled={!!activeUploadSource}
                          onChange={(event) => handleUpload(summary.source, event)}
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-3">
              <h3 className="font-display text-2xl tracking-tight">Latest Datasets</h3>
              {recentRecords.length === 0 && (
                <p className="text-sm text-[#696257] dark:text-[#a89d88]">No datasets uploaded yet.</p>
              )}
              {recentRecords.slice(0, 4).map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
                      {SOURCE_CONFIG[record.source].label}
                    </div>
                    <div className="text-sm">{record.fileName}</div>
                  </div>
                  <div className="text-sm text-[#696257] dark:text-[#a89d88]">
                    {record.entryCount.toLocaleString()} parsed · {new Date(record.importedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeView === 'command' && (
          <div className="space-y-5 pb-8">
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="surface-panel rounded-xl p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Datasets</div>
                <div className="text-2xl font-display mt-1">{records.length}</div>
              </div>
              <div className="surface-panel rounded-xl p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Source Coverage</div>
                <div className="text-2xl font-display mt-1">{dashboard.sourceCoverage}/4</div>
              </div>
              <div className="surface-panel rounded-xl p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Parsed Records</div>
                <div className="text-2xl font-display mt-1">{dashboard.totalParsedEntries.toLocaleString()}</div>
              </div>
              <div className="surface-panel rounded-xl p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Unique Metrics</div>
                <div className="text-2xl font-display mt-1">{dashboard.uniqueMetrics.toLocaleString()}</div>
              </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-4">
              <article className="surface-panel rounded-2xl p-5 md:p-6 space-y-4">
                <h3 className="font-display text-2xl tracking-tight">Source Health</h3>
                <div className="space-y-2">
                  {sourceSummaries.map((summary) => (
                    <div
                      key={summary.source}
                      className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm">{SOURCE_CONFIG[summary.source].label}</div>
                        <div className="text-xs text-[#696257] dark:text-[#a89d88]">
                          {summary.datasetCount} dataset{summary.datasetCount === 1 ? '' : 's'} ·{' '}
                          {summary.parsedEntries.toLocaleString()} parsed
                        </div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575] text-right">
                        {summary.latestImportedAt
                          ? new Date(summary.latestImportedAt).toLocaleDateString()
                          : 'No data'}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="surface-panel rounded-2xl p-5 md:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h3 className="font-display text-2xl tracking-tight">Metric Catalogue</h3>
                  <input
                    type="text"
                    value={metricQuery}
                    onChange={(event) => setMetricQuery(event.target.value)}
                    placeholder="Search metrics"
                    className="px-3 py-2 rounded-lg border border-[#d8cfbe] dark:border-[#342f25] bg-transparent text-sm outline-none focus:border-[#205c5a] dark:focus:border-[#79b7ab]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Genomics</div>
                    <div className="font-display text-xl mt-1">{dashboard.categoryCounts.genomics.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Nutrition</div>
                    <div className="font-display text-xl mt-1">{dashboard.categoryCounts.nutrition.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Biometric</div>
                    <div className="font-display text-xl mt-1">{dashboard.categoryCounts.biometric.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Lab</div>
                    <div className="font-display text-xl mt-1">{dashboard.categoryCounts.lab.toLocaleString()}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-3 max-h-72 overflow-y-auto">
                  {filteredMetrics.length === 0 && (
                    <div className="text-sm text-[#696257] dark:text-[#a89d88]">No matching metrics.</div>
                  )}
                  {filteredMetrics.map((item) => (
                    <div key={item.metric} className="py-2 border-b border-[#d8cfbe]/60 dark:border-[#342f25]/60 last:border-b-0 flex items-center justify-between gap-3">
                      <div className="text-sm">{item.metric}</div>
                      <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="surface-panel rounded-2xl p-5 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <h3 className="font-display text-2xl tracking-tight">Recent Datasets</h3>
                <div className="text-sm text-[#696257] dark:text-[#a89d88]">
                  {dashboard.latestImportedAt
                    ? `Last import: ${new Date(dashboard.latestImportedAt).toLocaleString()}`
                    : 'No imports yet'}
                </div>
              </div>

              {recentRecords.length === 0 && (
                <div className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4 text-sm text-[#696257] dark:text-[#a89d88]">
                  Upload at least one dataset to populate the command centre.
                </div>
              )}

              {recentRecords.map((record) => (
                <details key={record.id} className="rounded-xl border border-[#d8cfbe] dark:border-[#342f25] p-4">
                  <summary className="cursor-pointer">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
                          {SOURCE_CONFIG[record.source].label}
                        </div>
                        <div className="text-sm">{record.fileName}</div>
                      </div>
                      <div className="text-sm text-[#696257] dark:text-[#a89d88]">
                        {record.entryCount.toLocaleString()} parsed · {new Date(record.importedAt).toLocaleString()}
                      </div>
                    </div>
                  </summary>

                  <div className="pt-4 space-y-3">
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Stored</div>
                        <div className="font-display text-xl mt-1">{record.storedEntryCount.toLocaleString()}</div>
                      </div>
                      <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Metrics</div>
                        <div className="font-display text-xl mt-1">{record.uniqueMetricCount.toLocaleString()}</div>
                      </div>
                      <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Warnings</div>
                        <div className="font-display text-xl mt-1">{record.warnings.length}</div>
                      </div>
                      <div className="rounded-lg border border-[#d8cfbe] dark:border-[#342f25] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Range</div>
                        <div className="text-xs mt-1 text-[#696257] dark:text-[#a89d88]">
                          {record.dateRange
                            ? `${new Date(record.dateRange.start).toLocaleDateString()} - ${new Date(record.dateRange.end).toLocaleDateString()}`
                            : 'n/a'}
                        </div>
                      </div>
                    </div>

                    {record.warnings.length > 0 && (
                      <div className="rounded-lg border border-[#bca067] bg-[#bca067]/10 p-3 text-sm text-[#6b5529] dark:text-[#f4deb0]">
                        {record.warnings.join(' ')}
                      </div>
                    )}

                    {record.entries.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="text-left border-b border-[#d8cfbe] dark:border-[#342f25]">
                              <th className="py-2 pr-3">Metric</th>
                              <th className="py-2 pr-3">Value</th>
                              <th className="py-2 pr-3">Unit</th>
                              <th className="py-2 pr-3">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {record.entries.slice(0, 8).map((entry) => (
                              <tr key={entry.id} className="border-b border-[#d8cfbe]/50 dark:border-[#342f25]/60">
                                <td className="py-2 pr-3">{entry.metric}</td>
                                <td className="py-2 pr-3">{entry.value === null ? 'n/a' : String(entry.value)}</td>
                                <td className="py-2 pr-3">{entry.unit || 'n/a'}</td>
                                <td className="py-2 pr-3">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'n/a'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default BioDataHub;

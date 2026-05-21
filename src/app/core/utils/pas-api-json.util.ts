/**
 * ASP.NET Core often serializes JSON with PascalCase. Some endpoints return a bare
 * array, paged `{ items }`, or alternate envelope keys. These helpers normalize
 * responses so the rest of the app can rely on camelCase and predictable shapes.
 */

function readExplicitSuccess(r: Record<string, unknown>): boolean | undefined {
  const v =
    r['success'] ??
    r['Success'] ??
    r['succeeded'] ??
    r['Succeeded'] ??
    r['isSuccess'] ??
    r['IsSuccess'];
  return typeof v === 'boolean' ? v : undefined;
}

function readMessage(r: Record<string, unknown>): string | undefined {
  const m = r['message'] ?? r['Message'];
  return typeof m === 'string' ? m : undefined;
}

function readStatusCode(r: Record<string, unknown>): number | undefined {
  const s = r['statusCode'] ?? r['StatusCode'];
  return typeof s === 'number' && !Number.isNaN(s) ? s : undefined;
}

function readInnerPayload(r: Record<string, unknown>): unknown {
  return r['data'] ?? r['Data'] ?? r['value'] ?? r['Value'] ?? r['result'] ?? r['Result'];
}

function normalizedKeySet(obj: Record<string, unknown>): Set<string> {
  return new Set(Object.keys(obj).map((k) => k.toLowerCase()));
}

/** Dashboard statistics payload (envelope or bare). */
function looksLikeDashboardStatistics(obj: Record<string, unknown>): boolean {
  const k = normalizedKeySet(obj);
  return (
    k.has('totalproperties') ||
    k.has('totalemployees') ||
    k.has('pendingrequisitions') ||
    k.has('totalitems') ||
    k.has('recentactivities') ||
    k.has('lowstockitems') ||
    k.has('lowstockalerts') ||
    k.has('requisitionsbystatus')
  );
}

export function unwrapPasEnvelope<T = unknown>(raw: unknown): {
  success: boolean;
  message?: string;
  data?: T;
  statusCode?: number;
} {
  if (raw == null) {
    return { success: false, statusCode: 0 };
  }

  /** Some POST endpoints return the new entity id as a bare JSON string. */
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { success: false, statusCode: 0 };
    }
    return { success: true, data: trimmed as T, statusCode: 200 };
  }

  if (Array.isArray(raw)) {
    return { success: true, data: raw as T, statusCode: 200 };
  }

  if (typeof raw !== 'object') {
    return { success: false, statusCode: 0 };
  }

  const r = raw as Record<string, unknown>;
  const explicit = readExplicitSuccess(r);
  const message = readMessage(r);
  const statusCode = readStatusCode(r) ?? 200;
  const inner = readInnerPayload(r);

  const innerObject =
    inner !== undefined && inner !== null && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : null;
  const statsCandidate = innerObject ?? r;
  if (looksLikeDashboardStatistics(statsCandidate)) {
    const success = explicit !== false;
    return {
      success,
      message,
      data: (innerObject ?? statsCandidate) as T,
      statusCode,
    };
  }

  /** GET /Resource/{id} often returns the entity root with no `data` wrapper. */
  if (inner === undefined) {
    /** Dashboard statistics sometimes arrive as a bare root object (no `data` / `Data`). */
    if (looksLikeDashboardStatistics(r) && explicit !== false) {
      return {
        success: true,
        message,
        data: r as T,
        statusCode,
      };
    }
    const idLike = r['id'] ?? r['Id'];
    const bareId = typeof idLike === 'string' && idLike.trim() !== '';
    if (bareId && !looksLikeDashboardStatistics(r) && explicit !== false) {
      return {
        success: true,
        message,
        data: r as T,
        statusCode,
      };
    }
  }

  if (inner !== undefined) {
    const success = explicit === true || (explicit !== false && inner !== null);
    return {
      success,
      message,
      data: inner as T,
      statusCode,
    };
  }

  if (explicit !== undefined) {
    return { success: explicit, message, data: undefined, statusCode };
  }

  return { success: false, message, data: undefined, statusCode };
}

export function toCamelCaseDeep<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toCamelCaseDeep(item)) as T;
  }
  if (typeof value !== 'object') {
    return value as T;
  }
  if (value instanceof Date) {
    return value as T;
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camel = key.length ? key.charAt(0).toLowerCase() + key.slice(1) : key;
    out[camel] = toCamelCaseDeep(obj[key]);
  }
  return out as T;
}

function extractRowsFromPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const items =
      o['items'] ??
      o['Items'] ??
      o['warehouses'] ??
      o['Warehouses'] ??
      o['shelfLocations'] ??
      o['ShelfLocations'] ??
      o['shelves'] ??
      o['Shelves'];
    if (Array.isArray(items)) {
      return items;
    }
    const nested = o['data'] ?? o['Data'];
    if (Array.isArray(nested)) {
      return nested;
    }
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const no = nested as Record<string, unknown>;
      const inner =
        no['items'] ??
        no['Items'] ??
        no['warehouses'] ??
        no['Warehouses'] ??
        no['shelfLocations'] ??
        no['ShelfLocations'];
      if (Array.isArray(inner)) {
        return inner;
      }
    }
  }
  return [];
}

export function normalizePasListResponse<T>(raw: unknown): {
  success: boolean;
  message: string;
  data: T[];
  statusCode: number;
} {
  if (Array.isArray(raw)) {
    return {
      success: true,
      message: '',
      data: raw.map((row) => toCamelCaseDeep<T>(row)),
      statusCode: 200,
    };
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    const directItems =
      r['items'] ??
      r['Items'] ??
      r['warehouses'] ??
      r['Warehouses'] ??
      r['shelfLocations'] ??
      r['ShelfLocations'] ??
      r['shelves'] ??
      r['Shelves'];
    if (Array.isArray(directItems)) {
      const explicit = readExplicitSuccess(r);
      return {
        success: explicit !== false,
        message: readMessage(r) ?? '',
        data: directItems.map((row) => toCamelCaseDeep<T>(row)),
        statusCode: readStatusCode(r) ?? 200,
      };
    }
  }

  const env = unwrapPasEnvelope<unknown>(raw);
  const rows = extractRowsFromPayload(env.data);
  return {
    success: env.success,
    message: env.message ?? '',
    data: rows.map((row) => toCamelCaseDeep<T>(row)),
    statusCode: env.statusCode ?? 0,
  };
}

/** Normalizes a single-object API envelope (detail, create, update, approve, etc.). */
export function normalizeApiResponseModel<T>(raw: unknown): {
  success: boolean;
  message?: string;
  data?: T;
  statusCode: number;
} {
  const env = unwrapPasEnvelope<unknown>(raw);
  const data =
    env.data !== undefined && env.data !== null
      ? (typeof env.data === 'object' ? toCamelCaseDeep<T>(env.data) : (env.data as T))
      : undefined;
  return {
    success: env.success,
    message: env.message,
    data,
    statusCode: env.statusCode ?? 0,
  };
}

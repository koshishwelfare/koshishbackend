const BOOLEAN_TRUE = 'true';
const BOOLEAN_FALSE = 'false';

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === BOOLEAN_TRUE) return true;
  if (normalized === BOOLEAN_FALSE) return false;

  return value;
};

const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const sanitizeRegexText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
};

const normalizeSortOrder = (sortOrder) => {
  const value = String(sortOrder || '').toLowerCase();
  return value === 'asc' || value === '1' ? 1 : -1;
};

const buildFilter = (query, allowedFilterFields = []) => {
  const output = {};

  for (const field of allowedFilterFields) {
    if (query[field] === undefined) continue;

    const boolValue = parseBoolean(query[field]);
    const normalizedValue = parseNumber(boolValue);
    output[field] = normalizedValue;
  }

  return output;
};

const buildSearch = (searchValue, searchFields = []) => {
  const safeSearch = sanitizeRegexText(searchValue);
  if (!safeSearch || !searchFields.length) return {};

  const regex = new RegExp(safeSearch, 'i');
  return {
    $or: searchFields.map((field) => ({ [field]: { $regex: regex } }))
  };
};

const buildPagination = (page, limit) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedPage) || !Number.isInteger(parsedLimit)) {
    return null;
  }

  if (parsedPage < 1 || parsedLimit < 1) {
    return null;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const buildListQuery = ({
  query,
  baseFilter = {},
  allowedFilterFields = [],
  searchFields = [],
  defaultSortBy,
  allowedSortFields = [],
  defaultPage = 1,
  defaultLimit = 20
}) => {
  const { q, sortBy, sortOrder = 'desc', page = defaultPage, limit = defaultLimit } = query;

  const routeFilter = buildFilter(query, allowedFilterFields);
  const searchFilter = buildSearch(q, searchFields);

  const selectedSortField = allowedSortFields.includes(sortBy) ? sortBy : defaultSortBy;
  const selectedSortOrder = normalizeSortOrder(sortOrder);

  const mongoFilter = {
    ...routeFilter,
    ...searchFilter,
    ...baseFilter
  };

  return {
    filter: mongoFilter,
    sort: { [selectedSortField]: selectedSortOrder },
    pagination: buildPagination(page, limit)
  };
};

export { buildListQuery };

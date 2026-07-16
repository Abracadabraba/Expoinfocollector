import { COUNTRIES } from '../data/countries';
import { PRODUCT_LIST } from '../data/formSchema';

function sanitize(s) {
  return String(s || '')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Returns { exhibitionFolder, dateFolder (MMDD), filename, dateForFilename }
export function buildExportMeta(record, exhibitionNameFallback) {
  const basic = record.data.basic || {};
  const products = record.data.products || [];

  // Date: prefer the date the user filled in (YYYY-MM-DD from <input type="date">),
  // otherwise fall back to today.
  let dateObj;
  if (basic.date) {
    const parsed = new Date(basic.date);
    dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    dateObj = new Date();
  }
  const dateFolder = pad2(dateObj.getMonth() + 1) + pad2(dateObj.getDate());
  const dateForFilename = dateFolder;

  const countryEntry = COUNTRIES.find((c) => c.iso2 === basic.country);
  const countryLabel = sanitize(countryEntry?.cn || basic.country || '未知国家');

  const customerLabel = sanitize(basic.name || basic.company || record.id);

  const productLabel =
    products
      .map((key) => {
        const meta = PRODUCT_LIST.find((p) => p.key === key);
        if (!meta) return '';
        return sanitize(meta.label.split('/')[1] || meta.label.split(' ')[0]);
      })
      .filter(Boolean)
      .join('+') || '未选产品';

  const exhibitionFolder = sanitize(basic.exhibition || exhibitionNameFallback || '展会');

  const filename = `${countryLabel}_${customerLabel}_${productLabel}_${dateForFilename}.docx`;

  return { exhibitionFolder, dateFolder, filename };
}

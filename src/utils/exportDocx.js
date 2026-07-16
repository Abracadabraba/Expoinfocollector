import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  ImageRun,
  Footer,
  AlignmentType,
} from 'docx';
import {
  PRODUCT_LIST,
  PRODUCT_FIELDS,
  GMP_FIELDS,
  BASIC_INFO_FIELDS,
} from '../data/formSchema';
import { COUNTRIES } from '../data/countries';

function labelText(field) {
  return field.label;
}

function valueToString(field, value) {
  if (value === undefined || value === null) return '';
  if (field.type === 'checkboxGroup') {
    const arr = Array.isArray(value?.selected) ? value.selected : [];
    const other = value?.other ? `Other: ${value.other}` : '';
    return [...arr, other].filter(Boolean).join(', ');
  }
  if (field.type === 'radioGroup') {
    const sel = value?.selected || '';
    const detail = value?.detail ? ` (${value.detail})` : '';
    return sel + detail;
  }
  if (field.type === 'powerSpec') {
    const voltageRaw = value?.voltage || '';
    const voltage = voltageRaw === 'Other' ? value?.voltageOther || 'Other' : voltageRaw;
    const hz = value?.hz || '';
    const phase = value?.phase || '';
    return `${voltage} V / ${hz} Hz / ${phase}`;
  }
  if (field.type === 'selectWithOther') {
    const sel = value?.selected || '';
    if (sel === 'Other') return value?.other ? `Other: ${value.other}` : 'Other';
    return sel;
  }
  if (field.type === 'countrySelect') {
    const entry = COUNTRIES.find((c) => c.iso2 === value);
    return entry ? `${entry.cn} ${entry.en}` : String(value);
  }
  if (field.type === 'date') {
    return String(value);
  }
  return String(value);
}

function fieldRow(field, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 3600, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' },
        children: [new Paragraph({ children: [new TextRun({ text: labelText(field), bold: true })] })],
      }),
      new TableCell({
        width: { size: 6000, type: WidthType.DXA },
        children: [new Paragraph({ text: valueToString(field, value) || '—' })],
      }),
    ],
  });
}

function sectionTable(fields, dataObj) {
  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    columnWidths: [3600, 6000],
    rows: fields.map((f) => fieldRow(f, dataObj?.[f.key])),
  });
}

function dataUrlToImageInput(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  let type = 'jpg';
  if (mime.includes('png')) type = 'png';
  else if (mime.includes('gif')) type = 'gif';
  else if (mime.includes('bmp')) type = 'bmp';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { data: bytes, type };
}

function computeImageDisplaySize(naturalWidth, naturalHeight) {
  const maxWidth = 420;
  const maxHeight = 300;
  const w = naturalWidth || maxWidth;
  const h = naturalHeight || Math.round(maxWidth * 0.6);
  const scale = Math.min(maxWidth / w, maxHeight / h, 1);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}

export async function generateDocxBlob(record) {
  const data = record.data || {};
  const basic = data.basic || {};
  const selectedProducts = data.products || [];
  const productDetails = data.productDetails || {};
  const gmp = data.gmp || {};
  const communication = data.communication || {};

  const children = [];

  children.push(
    new Paragraph({
      text: 'CUSTOMER REGISTRATION FORM / 客户信息登记表',
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Record ID: ${record.id}   Version: ${
            record.history.length === 0 ? 'Original' : 'R' + record.history.length
          }   Updated: ${new Date(record.updatedAt).toLocaleString()}`,
          italics: true,
          size: 18,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Event info
  children.push(heading('Event Information / 展会信息'));
  children.push(sectionTable(BASIC_INFO_FIELDS.event, basic));

  // Customer info
  children.push(heading('1. Customer Information / 客户信息'));
  children.push(sectionTable(BASIC_INFO_FIELDS.customer, basic));

  // Business card photo (staple business card here)
  const cardImageInput = dataUrlToImageInput(basic.businessCardImage);
  if (cardImageInput) {
    const displaySize = computeImageDisplaySize(
      basic.businessCardImageWidth,
      basic.businessCardImageHeight
    );
    children.push(
      new Paragraph({
        spacing: { before: 150, after: 100 },
        children: [new TextRun({ text: 'Business Card / 名片：', bold: true, italics: true })],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: cardImageInput.data,
            type: cardImageInput.type,
            transformation: displaySize,
          }),
        ],
      })
    );
  }

  // Products of interest
  children.push(heading('Products of Interest / 意向产品'));
  const productLabels = selectedProducts
    .map((key) => PRODUCT_LIST.find((p) => p.key === key)?.label)
    .filter(Boolean);
  children.push(new Paragraph({ text: productLabels.join(', ') || '—' }));

  // Product details
  if (selectedProducts.length > 0) {
    children.push(heading('2. Product Requirement Details / 产品需求详情'));
    selectedProducts.forEach((key) => {
      const productMeta = PRODUCT_LIST.find((p) => p.key === key);
      const fields = PRODUCT_FIELDS[key] || [];
      children.push(heading(productMeta?.label || key, HeadingLevel.HEADING_3));
      children.push(sectionTable(fields, productDetails[key]));
      const remark = productDetails[key]?.remark;
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 200 },
          children: [
            new TextRun({ text: 'Remark / 备注: ', bold: true }),
            new TextRun({ text: remark || '—' }),
          ],
        })
      );
    });
  }

  // GMP section
  children.push(heading('3. GMP Compliance & Process Requirements / GMP合规与工艺要求'));
  children.push(sectionTable(GMP_FIELDS, gmp));
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({ text: 'Remark / 备注: ', bold: true }),
        new TextRun({ text: gmp.remark || '—' }),
      ],
    })
  );

  // Communication
  children.push(heading('4. Communication Records / 沟通记录'));
  const participants = [
    ...(communication.persons || []),
    communication.otherPerson ? `Other: ${communication.otherPerson}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Participants in the discussion / 参与沟通人员: ', bold: true }),
        new TextRun({ text: participants || '—' }),
      ],
      spacing: { after: 100 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Memo / 备注: ', bold: true }), new TextRun({ text: communication.memo || '—' })],
      spacing: { after: 200 },
    })
  );

  // Revision history
  if (record.history.length > 0) {
    children.push(heading('Revision History / 修改记录'));
    record.history.forEach((h) => {
      children.push(
        new Paragraph({
          text: `${h.version} — saved at ${new Date(h.savedAt).toLocaleString()}`,
        })
      );
    });
    children.push(
      new Paragraph({
        text: `Current version: ${'R' + record.history.length}`,
      })
    );
  }

  // Copyright / rights notice at the end of the document body
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '© SKE&Eagle Group', size: 18, color: '999999' })],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 } }, // A4
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '© SKE&Eagle Group', size: 16, color: '999999' })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

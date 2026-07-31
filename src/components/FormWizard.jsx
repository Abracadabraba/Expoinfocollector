import React, { useEffect, useMemo, useState } from 'react';
import FieldRenderer from './FieldRenderer';
import BusinessCardCapture from './BusinessCardCapture';
import {
  PRODUCT_LIST,
  PRODUCT_FIELDS,
  GMP_FIELDS,
  BASIC_INFO_FIELDS,
} from '../data/formSchema';
import { COUNTRIES } from '../data/countries';
import { getSettings } from '../utils/settings';
import { createRecord, updateRecord } from '../utils/db';
import { generateDocxBlob } from '../utils/exportDocx';
import { saveDocxToDownloads } from '../utils/saveFile';
import { buildExportMeta } from '../utils/exportMeta';

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getCustomerField(key) {
  return BASIC_INFO_FIELDS.customer.find((f) => f.key === key);
}

const emptyData = (settings) => ({
  basic: {
    exhibition: settings.exhibitionName,
    date: todayISO(),
  },
  products: [],
  productDetails: {},
  gmp: {},
  communication: { persons: [], otherPerson: '', memo: '' },
});

export default function FormWizard({ existingRecord, onDone, onCancel }) {
  const [settings] = useState(() => getSettings());
  const [data, setData] = useState(() => existingRecord?.data || emptyData(settings));
  const [currentRecord, setCurrentRecord] = useState(existingRecord || null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [lastExportPath, setLastExportPath] = useState(null);

  const selectedProducts = data.products || [];

  const firstPowerProductKey = useMemo(
    () =>
      selectedProducts.find((key) =>
        (PRODUCT_FIELDS[key] || []).some((f) => f.key === 'powerSpec')
      ) || null,
    [selectedProducts]
  );

  const steps = useMemo(() => {
    const s = ['basic'];
    selectedProducts.forEach((p) => s.push('product:' + p));
    s.push('gmp', 'communication', 'review');
    return s;
  }, [selectedProducts]);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [stepIndex]);

  function updateBasic(key, value) {
    setData((d) => ({ ...d, basic: { ...d.basic, [key]: value } }));
  }

  function handleCountryChange(iso2) {
    setData((d) => {
      const nextBasic = { ...d.basic, country: iso2 };
      // Auto-insert the dial code into an empty phone field to save typing.
      const entry = COUNTRIES.find((c) => c.iso2 === iso2);
      if (entry && !nextBasic.telWhatsapp) {
        nextBasic.telWhatsapp = `+${entry.dial} `;
      }
      return { ...d, basic: nextBasic };
    });
  }

  function insertDialCode() {
    setData((d) => {
      const entry = COUNTRIES.find((c) => c.iso2 === d.basic.country);
      if (!entry) return d;
      const current = d.basic.telWhatsapp || '';
      const prefix = `+${entry.dial} `;
      const withoutOldPrefix = current.replace(/^\+\d+\s*/, '');
      return { ...d, basic: { ...d.basic, telWhatsapp: prefix + withoutOldPrefix } };
    });
  }

  function toggleProduct(key) {
    setData((d) => {
      const has = d.products.includes(key);
      const products = has ? d.products.filter((p) => p !== key) : [...d.products, key];
      return { ...d, products };
    });
  }

  function updateOtherProductText(value) {
    setData((d) => ({ ...d, basic: { ...d.basic, otherProductText: value } }));
  }

  function updateProductDetail(productKey, fieldKey, value) {
    setData((d) => ({
      ...d,
      productDetails: {
        ...d.productDetails,
        [productKey]: {
          ...d.productDetails[productKey],
          [fieldKey]: value,
        },
      },
    }));
  }

  function updateGmp(fieldKey, value) {
    setData((d) => ({ ...d, gmp: { ...d.gmp, [fieldKey]: value } }));
  }

  function toggleCommunicationPerson(person) {
    setData((d) => {
      const has = (d.communication.persons || []).includes(person);
      const persons = has
        ? d.communication.persons.filter((p) => p !== person)
        : [...(d.communication.persons || []), person];
      return { ...d, communication: { ...d.communication, persons } };
    });
  }

  function updateCommunication(key, value) {
    setData((d) => ({ ...d, communication: { ...d.communication, [key]: value } }));
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      let record;
      if (currentRecord) {
        record = updateRecord(currentRecord.id, data);
        setSavedMessage(
          `已保存为新版本 ${'R' + record.history.length} / Saved as new version R${record.history.length}`
        );
      } else {
        record = createRecord(data);
        setSavedMessage('已创建新客户记录 / New record created');
      }
      setCurrentRecord(record);
      return record;
    } catch (e) {
      // Previously an error here (e.g. storage full) would throw past this
      // point and leave `saving` stuck at true forever, permanently graying
      // out both the Save and Export buttons even though nothing was wrong
      // with Export itself. Now we always surface the error and reset state.
      console.error('Save failed', e);
      setSaveError(
        e && e.name === 'StorageFullError'
          ? e.message
          : '保存失败，请重试 / Save failed, please try again'
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  function handleBackToHome() {
    onDone();
  }

  async function handleExportDocx() {
    // Exporting never touches the database — it just renders whatever is
    // currently on screen. This avoids creating extra records in the list.
    const exportSource = currentRecord
      ? { ...currentRecord, data }
      : { id: 'DRAFT', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), data, history: [] };
    const blob = await generateDocxBlob(exportSource);
    const meta = buildExportMeta(exportSource, settings.exhibitionName);
    const result = await saveDocxToDownloads(blob, {
      exhibitionFolder: meta.exhibitionFolder,
      dateFolder: meta.dateFolder,
      filename: meta.filename,
    });
    if (result.method === 'downloads') {
      setSavedMessage(`已导出 / Exported to: Download/${meta.exhibitionFolder}/${meta.dateFolder}/${meta.filename}`);
      setLastExportPath(window.electronAPI?.isElectron ? result.path : null);
    } else if (result.method === 'share') {
      setSavedMessage('已生成文档，请在分享菜单中选择保存位置 / File ready, choose where to save from the share sheet');
      setLastExportPath(null);
    } else {
      setSavedMessage(`已下载 / Downloaded: ${meta.filename}`);
      setLastExportPath(null);
    }
  }

  return (
    <div className="wizard">
      <div className="wizard-progress">
        步骤 {stepIndex + 1} / {steps.length}
      </div>

      {currentStep === 'basic' && (
        <div className="step">
          <h2>展会 & 客户信息 / Event & Customer Info</h2>
          <h3>Event / 展会</h3>
          <FieldRenderer
            field={BASIC_INFO_FIELDS.event[0]}
            value={data.basic.exhibition}
            onChange={updateBasic}
          />
          <FieldRenderer
            field={BASIC_INFO_FIELDS.event[1]}
            value={data.basic.date}
            onChange={updateBasic}
          />
          <FieldRenderer
            field={BASIC_INFO_FIELDS.event[2]}
            value={data.basic.boothNo ?? BASIC_INFO_FIELDS.event[2].default}
            onChange={updateBasic}
          />
          <div className="field">
            <label>Sales Rep / 销售负责人</label>
            <select
              value={data.basic.salesRep || ''}
              onChange={(e) => updateBasic('salesRep', e.target.value)}
            >
              <option value="">-- 请选择 / Select --</option>
              {settings.teamMembers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="hint-text">名单可在"设置"里维护 / Manage the list in Settings</p>
          </div>

          <h3>1. Customer Information / 客户信息</h3>

          <BusinessCardCapture
            cardImage={data.basic.businessCardImage}
            currentValues={{ name: data.basic.name, company: data.basic.company }}
            onImageCaptured={(img, meta) => {
              updateBasic('businessCardImage', img);
              updateBasic('businessCardImageWidth', meta?.width);
              updateBasic('businessCardImageHeight', meta?.height);
            }}
            onApplyField={(key, value) => updateBasic(key, value)}
          />

          <div className="name-row">
            <FieldRenderer
              field={getCustomerField('namePrefix')}
              value={data.basic.namePrefix}
              onChange={updateBasic}
            />
            <FieldRenderer
              field={getCustomerField('name')}
              value={data.basic.name}
              onChange={updateBasic}
            />
          </div>
          <FieldRenderer
            field={getCustomerField('position')}
            value={data.basic.position}
            onChange={updateBasic}
          />
          <FieldRenderer
            field={getCustomerField('company')}
            value={data.basic.company}
            onChange={updateBasic}
          />
          <FieldRenderer
            field={getCustomerField('country')}
            value={data.basic.country}
            onChange={(key, value) => handleCountryChange(value)}
          />
          <div className="field">
            <label>Tel / WhatsApp</label>
            <div className="phone-row">
              <input
                type="text"
                value={data.basic.telWhatsapp || ''}
                onChange={(e) => updateBasic('telWhatsapp', e.target.value)}
                placeholder="+区号 电话号码"
              />
              <button type="button" className="btn small" onClick={insertDialCode}>
                插入区号
              </button>
            </div>
          </div>
          <FieldRenderer
            field={getCustomerField('email')}
            value={data.basic.email}
            onChange={updateBasic}
          />
          <FieldRenderer
            field={getCustomerField('website')}
            value={data.basic.website}
            onChange={updateBasic}
          />

          <h3>Products of Interest / 意向产品（多选）</h3>
          <div className="checkbox-group">
            {PRODUCT_LIST.map((p) => (
              <label key={p.key} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.key)}
                  onChange={() => toggleProduct(p.key)}
                />
                {p.label}
              </label>
            ))}
          </div>
          {selectedProducts.includes('others') && (
            <input
              type="text"
              className="other-input"
              placeholder="请描述其他产品 / Describe other product..."
              value={data.basic.otherProductText || ''}
              onChange={(e) => updateOtherProductText(e.target.value)}
            />
          )}
        </div>
      )}

      {currentStep.startsWith('product:') && (
        <ProductStep
          productKey={currentStep.split(':')[1]}
          data={data}
          updateProductDetail={updateProductDetail}
          firstPowerProductKey={firstPowerProductKey}
        />
      )}

      {currentStep === 'gmp' && (
        <div className="step">
          <h2>3. GMP Compliance & Process Requirements / GMP合规与工艺要求</h2>
          {GMP_FIELDS.map((f) => (
            <FieldRenderer key={f.key} field={f} value={data.gmp[f.key]} onChange={updateGmp} />
          ))}
          <div className="field">
            <label>备注 / Remark (以防有未尽事宜)</label>
            <textarea
              rows={3}
              value={data.gmp.remark || ''}
              onChange={(e) => updateGmp('remark', e.target.value)}
              placeholder="补充说明..."
            />
          </div>
        </div>
      )}

      {currentStep === 'communication' && (
        <div className="step">
          <h2>4. Communication Records / 沟通记录</h2>
          <div className="field">
            <label>Participants in the discussion / 参与沟通人员</label>
            <div className="checkbox-group">
              {settings.teamMembers.map((p) => (
                <label key={p} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={(data.communication.persons || []).includes(p)}
                    onChange={() => toggleCommunicationPerson(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
            <input
              type="text"
              className="other-input"
              placeholder="其他 / Other (手动输入姓名)"
              value={data.communication.otherPerson || ''}
              onChange={(e) => updateCommunication('otherPerson', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Memo / 备注</label>
            <textarea
              rows={5}
              value={data.communication.memo || ''}
              onChange={(e) => updateCommunication('memo', e.target.value)}
              placeholder="沟通详情、跟进事项..."
            />
          </div>
        </div>
      )}

      {currentStep === 'review' && (
        <div className="step">
          <h2>确认 & 保存 / Review & Save</h2>
          <p>请检查以上信息无误后保存或导出。</p>
          {savedMessage && <div className="saved-banner">{savedMessage}</div>}
          {saveError && <p className="error-text">{saveError}</p>}
          {lastExportPath && (
            <button
              className="btn small"
              onClick={() => window.electronAPI?.showFileInFolder(lastExportPath)}
            >
              在文件夹中显示 / Show in Folder
            </button>
          )}
          <div className="review-actions">
            <button className="btn primary" disabled={saving} onClick={handleSave}>
              {currentRecord ? '保存修改 / Save Changes' : '保存 / Save'}
            </button>
            <button className="btn" disabled={saving} onClick={handleExportDocx}>
              导出 Word 文档 / Export .docx
            </button>
            <button className="btn secondary" onClick={handleBackToHome}>
              返回首页 / Back to Home
            </button>
          </div>
        </div>
      )}

      <div className="wizard-nav">
        <button className="btn" onClick={onCancel}>
          取消 / Cancel
        </button>
        <div className="spacer" />
        <button className="btn" onClick={goBack} disabled={stepIndex === 0}>
          上一步 / Back
        </button>
        <button className="btn primary" onClick={goNext} disabled={stepIndex === steps.length - 1}>
          下一步 / Next
        </button>
      </div>
    </div>
  );
}

function ProductStep({ productKey, data, updateProductDetail, firstPowerProductKey }) {
  const fields = PRODUCT_FIELDS[productKey] || [];
  const productMeta = PRODUCT_LIST.find((p) => p.key === productKey);
  const detail = data.productDetails[productKey] || {};
  const hasPowerSpec = fields.some((f) => f.key === 'powerSpec');
  const isReferenceDevice = productKey === firstPowerProductKey;
  const referenceDetail = firstPowerProductKey ? data.productDetails[firstPowerProductKey] || {} : null;

  function copyFromFirstDevice() {
    if (!referenceDetail) return;
    updateProductDetail(productKey, 'powerSpec', referenceDetail.powerSpec);
    updateProductDetail(productKey, 'certRequirements', referenceDetail.certRequirements);
  }

  // The first time this (non-reference) product step is opened, default its
  // power spec + cert requirements to match the first device, to save re-typing.
  useEffect(() => {
    if (
      hasPowerSpec &&
      !isReferenceDevice &&
      referenceDetail &&
      detail.powerSpec === undefined &&
      detail.certRequirements === undefined
    ) {
      copyFromFirstDevice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productKey]);

  return (
    <div className="step">
      <h2>{productMeta?.label}</h2>
      {hasPowerSpec && !isReferenceDevice && referenceDetail && (
        <div className="saved-banner copy-hint">
          电压/频率/相数、设备认证要求 已默认带入第一台设备的内容，如有不同可直接修改；
          设备认证要求可为本设备单独填写不同的认证。
          <button type="button" className="btn small" onClick={copyFromFirstDevice}>
            重新复制第一台设备的内容
          </button>
        </div>
      )}
      {fields.map((f) => (
        <FieldRenderer
          key={f.key}
          field={f}
          value={detail[f.key]}
          onChange={(k, v) => updateProductDetail(productKey, k, v)}
        />
      ))}
      <div className="field">
        <label>备注 / Remark (以防有未尽事宜)</label>
        <textarea
          rows={3}
          value={detail.remark || ''}
          onChange={(e) => updateProductDetail(productKey, 'remark', e.target.value)}
          placeholder="补充说明..."
        />
      </div>
    </div>
  );
}

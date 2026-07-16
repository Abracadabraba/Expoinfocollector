import React from 'react';
import SearchableSelect from './SearchableSelect';
import { COUNTRIES } from '../data/countries';

export default function FieldRenderer({ field, value, onChange }) {
  const update = (newVal) => onChange(field.key, newVal);

  if (field.type === 'countrySelect') {
    const options = COUNTRIES.map((c) => ({
      value: c.iso2,
      label: `${c.cn} ${c.en}`,
      sublabel: c.en,
    }));
    return (
      <div className="field">
        <label>{field.label}</label>
        <SearchableSelect
          options={options}
          value={value}
          onChange={update}
          placeholder="搜索国家 / Search country..."
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="field">
        <label>{field.label}</label>
        <select value={value || ''} onChange={(e) => update(e.target.value)}>
          <option value="">-- 请选择 / Select --</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'selectWithOther') {
    const sel = value?.selected || '';
    const other = value?.other || '';
    return (
      <div className="field">
        <label>{field.label}</label>
        <select
          value={sel}
          onChange={(e) => update({ ...value, selected: e.target.value })}
        >
          <option value="">-- 请选择 / Select --</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="Other">Other / 其他</option>
        </select>
        {sel === 'Other' && (
          <input
            type="text"
            className="other-input"
            placeholder="请输入 / Enter..."
            value={other}
            onChange={(e) => update({ ...value, other: e.target.value })}
          />
        )}
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className="field">
        <label>{field.label}</label>
        <input type="date" value={value || ''} onChange={(e) => update(e.target.value)} />
      </div>
    );
  }

  if (field.type === 'text') {
    return (
      <div className="field">
        <label>{field.label}</label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => update(e.target.value)}
          placeholder="请输入 / Enter..."
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="field">
        <label>{field.label}</label>
        <textarea
          rows={4}
          value={value || ''}
          onChange={(e) => update(e.target.value)}
          placeholder="请输入 / Enter..."
        />
      </div>
    );
  }

  if (field.type === 'checkboxGroup') {
    const selected = value?.selected || [];
    const other = value?.other || '';
    const toggle = (opt) => {
      const next = selected.includes(opt)
        ? selected.filter((o) => o !== opt)
        : [...selected, opt];
      update({ ...value, selected: next });
    };
    return (
      <div className="field">
        <label>{field.label}</label>
        <div className="checkbox-group">
          {field.options.map((opt) => (
            <label key={opt} className="checkbox-item">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
        {field.allowOther && (
          <input
            type="text"
            className="other-input"
            placeholder="Other / 其他..."
            value={other}
            onChange={(e) => update({ ...value, other: e.target.value })}
          />
        )}
      </div>
    );
  }

  if (field.type === 'radioGroup') {
    const selected = value?.selected || '';
    const detail = value?.detail || '';
    return (
      <div className="field">
        <label>{field.label}</label>
        <div className="checkbox-group">
          {field.options.map((opt) => (
            <label key={opt} className="checkbox-item">
              <input
                type="radio"
                name={field.key}
                checked={selected === opt}
                onChange={() => update({ ...value, selected: opt })}
              />
              {opt}
            </label>
          ))}
        </div>
        {field.allowOtherDetailText && (
          <input
            type="text"
            className="other-input"
            placeholder="详情 / Details..."
            value={detail}
            onChange={(e) => update({ ...value, detail: e.target.value })}
          />
        )}
      </div>
    );
  }

  if (field.type === 'powerSpec') {
    const v = value || {};
    const voltageOptions = ['220', '230', '240', '380', '400', '415', '440', '460', '480'];
    const voltageIsOther = v.voltage === 'Other';
    return (
      <div className="field">
        <label>{field.label}</label>
        <div className="power-spec-row">
          <select value={v.voltage || ''} onChange={(e) => update({ ...v, voltage: e.target.value })}>
            <option value="">V --</option>
            {voltageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} V
              </option>
            ))}
            <option value="Other">Other / 其他</option>
          </select>
          <select value={v.hz || ''} onChange={(e) => update({ ...v, hz: e.target.value })}>
            <option value="">Hz --</option>
            <option value="50">50 Hz</option>
            <option value="60">60 Hz</option>
          </select>
          <select
            value={v.phase || ''}
            onChange={(e) => update({ ...v, phase: e.target.value })}
          >
            <option value="">--</option>
            <option value="3-phase">3-phase / 三相</option>
            <option value="1-phase">1-phase / 单相</option>
          </select>
        </div>
        {voltageIsOther && (
          <input
            type="text"
            className="other-input"
            placeholder="请输入电压 / Enter voltage..."
            value={v.voltageOther || ''}
            onChange={(e) => update({ ...v, voltageOther: e.target.value })}
          />
        )}
      </div>
    );
  }

  return null;
}

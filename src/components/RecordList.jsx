import React, { useState } from 'react';
import { listRecords, deleteRecord, currentVersionLabel } from '../utils/db';
import { generateDocxBlob } from '../utils/exportDocx';
import { saveDocxToDownloads } from '../utils/saveFile';
import { buildExportMeta } from '../utils/exportMeta';
import { getSettings } from '../utils/settings';

export default function RecordList({ onCreateNew, onEdit, onOpenSettings }) {
  const [records, setRecords] = useState(() => listRecords());
  const [query, setQuery] = useState('');

  function refresh() {
    setRecords(listRecords());
  }

  function handleDelete(id) {
    if (window.confirm('确定删除该客户记录吗？此操作不可恢复。\nDelete this record permanently?')) {
      deleteRecord(id);
      refresh();
    }
  }

  async function handleExport(record) {
    const settings = getSettings();
    const blob = await generateDocxBlob(record);
    const meta = buildExportMeta(record, settings.exhibitionName);
    const result = await saveDocxToDownloads(blob, {
      exhibitionFolder: meta.exhibitionFolder,
      dateFolder: meta.dateFolder,
      filename: meta.filename,
    });
    if (result.method === 'downloads') {
      window.alert(`已导出到 / Exported to:\nDownload/${meta.exhibitionFolder}/${meta.dateFolder}/${meta.filename}`);
      if (window.electronAPI?.isElectron && result.path) {
        window.electronAPI.showFileInFolder(result.path);
      }
    } else if (result.method === 'share') {
      window.alert('文档已生成，请在弹出的分享菜单中选择保存位置 / File ready — choose a save location from the share sheet');
    }
  }

  const filtered = records.filter((r) => {
    const b = r.data.basic || {};
    const haystack = `${b.name || ''} ${b.company || ''} ${b.country || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="record-list">
      <div className="list-header">
        <h1>制药用水设备展会客户收集 / Customer Registration</h1>
        <div className="header-actions">
          <button className="btn" onClick={onOpenSettings}>
            ⚙ 设置 / Settings
          </button>
          <button className="btn primary" onClick={onCreateNew}>
            + 新建客户 / New Customer
          </button>
        </div>
      </div>
      <input
        className="search-box"
        placeholder="搜索 姓名/公司/国家 / Search name, company, country..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="empty-hint">暂无记录，点击右上角新建。/ No records yet.</p>
      )}

      <ul className="records">
        {filtered.map((r) => {
          const b = r.data.basic || {};
          return (
            <li key={r.id} className="record-card">
              <div className="record-main" onClick={() => onEdit(r)}>
                <div className="record-title">
                  {b.company || '未命名公司'} — {b.name || '未填写姓名'}
                </div>
                <div className="record-sub">
                  {b.country || ''} · 版本 {currentVersionLabel(r)} · 更新于{' '}
                  {new Date(r.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="record-actions">
                <button className="btn small" onClick={() => onEdit(r)}>
                  编辑 / Edit
                </button>
                <button className="btn small" onClick={() => handleExport(r)}>
                  导出 / Export
                </button>
                <button className="btn small danger" onClick={() => handleDelete(r.id)}>
                  删除 / Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="app-footer">© SKE&Eagle Group</div>
    </div>
  );
}

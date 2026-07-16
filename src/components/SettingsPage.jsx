import React, { useState } from 'react';
import { getSettings, saveSettings } from '../utils/settings';

export default function SettingsPage({ onBack }) {
  const [settings, setSettings] = useState(() => getSettings());
  const [newMember, setNewMember] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  function updateExhibition(value) {
    setSettings((s) => ({ ...s, exhibitionName: value }));
  }

  function addMember() {
    const name = newMember.trim();
    if (!name) return;
    if (settings.teamMembers.includes(name)) {
      setNewMember('');
      return;
    }
    setSettings((s) => ({ ...s, teamMembers: [...s.teamMembers, name] }));
    setNewMember('');
  }

  function removeMember(name) {
    setSettings((s) => ({ ...s, teamMembers: s.teamMembers.filter((m) => m !== name) }));
  }

  function handleSave() {
    saveSettings(settings);
    setSavedMsg('已保存 / Saved');
    setTimeout(() => setSavedMsg(''), 1500);
  }

  return (
    <div className="wizard">
      <h2>设置 / Settings</h2>

      <div className="field">
        <label>默认展会名称 / Default Exhibition Name</label>
        <input
          type="text"
          value={settings.exhibitionName}
          onChange={(e) => updateExhibition(e.target.value)}
          placeholder="例如：Medipharma Vietnam 2026"
        />
        <p className="hint-text">
          新建客户记录时会自动带入这个展会名称；导出 Word 时也会用作 Downloads 文件夹的名字。
        </p>
      </div>

      <div className="field">
        <label>销售/沟通人员名单 / Team Members</label>
        <p className="hint-text">
          这里维护的名单会同时出现在"Sales Rep 下拉菜单"和"沟通人员多选"里，方便快速选择。
        </p>
        <div className="member-list">
          {settings.teamMembers.map((m) => (
            <span key={m} className="member-chip">
              {m}
              <button className="chip-remove" onClick={() => removeMember(m)} aria-label="remove">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="add-member-row">
          <input
            type="text"
            placeholder="添加姓名 / Add name"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMember();
            }}
          />
          <button className="btn" onClick={addMember}>
            添加 / Add
          </button>
        </div>
      </div>

      {savedMsg && <div className="saved-banner">{savedMsg}</div>}

      <div className="wizard-nav">
        <button className="btn" onClick={onBack}>
          返回 / Back
        </button>
        <div className="spacer" />
        <button className="btn primary" onClick={handleSave}>
          保存设置 / Save Settings
        </button>
      </div>
    </div>
  );
}

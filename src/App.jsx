import React, { useState } from 'react';
import RecordList from './components/RecordList';
import FormWizard from './components/FormWizard';
import SettingsPage from './components/SettingsPage';
import './App.css';

export default function App() {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'settings'
  const [editingRecord, setEditingRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openNew() {
    setEditingRecord(null);
    setView('form');
  }

  function openEdit(record) {
    setEditingRecord(record);
    setView('form');
  }

  function openSettings() {
    setView('settings');
  }

  function backToList() {
    setRefreshKey((k) => k + 1);
    setView('list');
  }

  return (
    <div className="app-shell">
      {view === 'list' && (
        <RecordList key={refreshKey} onCreateNew={openNew} onEdit={openEdit} onOpenSettings={openSettings} />
      )}
      {view === 'form' && (
        <FormWizard
          existingRecord={editingRecord}
          onDone={backToList}
          onCancel={backToList}
        />
      )}
      {view === 'settings' && <SettingsPage onBack={backToList} />}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import RecordList from './components/RecordList';
import FormWizard from './components/FormWizard';
import SettingsPage from './components/SettingsPage';
import { pruneHistoryImages } from './utils/db';
import './App.css';

export default function App() {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'settings'
  const [editingRecord, setEditingRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // One-time cleanup for people upgrading from an older version of the app:
  // earlier builds kept a full copy of the business-card photo in every
  // edit-history entry, which could fill up localStorage's quota after just
  // a few edits and make new saves silently fail. This reclaims that space
  // without touching any record's current data or photo.
  useEffect(() => {
    pruneHistoryImages();
  }, []);

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

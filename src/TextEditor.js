import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import { io } from 'socket.io-client';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import html2pdf from 'html2pdf.js';

const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];

let socket;
let quill;

export default function TextEditor() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('tabs');
    return saved ? JSON.parse(saved) : [documentId];
  });

  // Tab Handlers
  const handleNewTab = () => {
    const newId = uuidV4();
    const newTabs = [...tabs, newId];
    setTabs(newTabs);
    localStorage.setItem('tabs', JSON.stringify(newTabs));
    navigate(`/documents/${newId}`);
  };

  const handleSwitchTab = (tabId) => navigate(`/documents/${tabId}`);

  const handleRemoveTab = (tabId) => {
    const newTabs = tabs.filter(t => t !== tabId);
    setTabs(newTabs);
    localStorage.setItem('tabs', JSON.stringify(newTabs));

    if (tabId === documentId) {
      if (newTabs.length) navigate(`/documents/${newTabs[0]}`);
      else {
        const freshId = uuidV4();
        setTabs([freshId]);
        navigate(`/documents/${freshId}`);
      }
    }
  };

  // Dark Mode Toggle
  const toggleDarkMode = () => {
    setDarkMode((d) => !d);
    document.body.classList.toggle('dark-mode');
  };

  // Undo / Redo
  const handleUndo = () => quill?.history.undo();
  const handleRedo = () => quill?.history.redo();

  // Export PDF
  const exportToPDF = () => {
    const content = document.querySelector('.ql-editor');
    if (content) html2pdf().from(content).save('document.pdf');
  };

  // Manual Save
  const handleManualSave = async () => {
    const title = prompt('Enter document title:');
    if (!title) return;
    const content = quill.getContents();

    try {
      const res = await fetch('http://localhost:5000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: documentId, title, data: content }),
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('✅ Document saved!');
    } catch (err) {
      alert('❌ Save failed.');
      console.error(err);
    }
  };

  // Initialize Quill
  const wrapperRef = useCallback((wrapper) => {
    if (!wrapper) return;
    wrapper.innerHTML = '';
    const editor = document.createElement('div');
    wrapper.append(editor);
    quill = new Quill(editor, {
      theme: 'snow',
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        history: { delay: 1000, maxStack: 500, userOnly: true },
      },
    });
    quill.disable();
    quill.setText('Loading...');
  }, []);

  // Socket setup
  useEffect(() => {
    socket = io('http://localhost:5000');
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!quill) return;
    socket.once('load-document', (doc) => {
      const localDoc = localStorage.getItem(documentId);
      quill.setContents(localDoc ? JSON.parse(localDoc) : doc);
      quill.enable();
    });
    socket.emit('get-document', documentId);
  }, [documentId]);

  useEffect(() => {
    if (!quill || !socket) return;
    const handleReceive = (delta) => quill.updateContents(delta);
    socket.on('receive-changes', handleReceive);
    return () => socket.off('receive-changes', handleReceive);
  }, []);

  useEffect(() => {
    if (!quill || !socket) return;
    const handleSend = (delta, oldDelta, source) => {
      if (source === 'user') socket.emit('send-changes', delta);
    };
    quill.on('text-change', handleSend);
    return () => quill.off('text-change', handleSend);
  }, []);

  useEffect(() => {
    if (!quill || !socket) return;
    const interval = setInterval(() => {
      const content = quill.getContents();
      socket.emit('save-document', content);
      localStorage.setItem(documentId, JSON.stringify(content));
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [documentId]);

  return (
    <div className={`text-editor-container ${darkMode ? 'dark-mode' : ''}`} style={styles.container}>
      {/* Sidebar Tabs */}
      <nav style={styles.sidebar}>
        <h5 style={{ textAlign: 'center', marginBottom: 16 }}>Documents</h5>
        {tabs.map((tabId, idx) => (
          <div
            key={tabId}
            style={{
              ...styles.tab,
              ...(tabId === documentId ? styles.activeTab : {}),
            }}
          >
            <button
              style={styles.tabButton}
              onClick={() => handleSwitchTab(tabId)}
              title={`Document ${idx + 1}`}
            >
              📄 Doc {idx + 1}
            </button>
            <button style={styles.closeBtn} onClick={() => handleRemoveTab(tabId)}>
              ✖
            </button>
          </div>
        ))}
        <button style={styles.newTabBtn} onClick={handleNewTab}>
          ➕ New Document
        </button>
      </nav>

      {/* Main area */}
      <main style={styles.mainArea}>
        {/* Top controls */}
        <header style={styles.topBar}>
          <button onClick={toggleDarkMode} style={styles.topBtn}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={exportToPDF} style={styles.topBtn}>📄 Export PDF</button>
          <button onClick={handleManualSave} style={styles.topBtn}>💾 Save</button>
          <button onClick={handleUndo} style={styles.topBtn}>↩️ Undo</button>
          <button onClick={handleRedo} style={styles.topBtn}>↪️ Redo</button>
          <button onClick={() => navigate('/')} style={styles.topBtn}>🏠 Home</button>
        </header>

        {/* Editor */}
        <section style={styles.editorWrapper} ref={wrapperRef}></section>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  sidebar: {
    width: 220,
    backgroundColor: '#f4f4f4',
    borderRight: '1px solid #ddd',
    padding: '1rem',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  activeTab: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  tabButton: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: 'inherit',
    textAlign: 'left',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'red',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '0 8px',
  },
  newTabBtn: {
    marginTop: 16,
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#28a745',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  mainArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    padding: '12px 20px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  topBtn: {
    backgroundColor: '#007bff',
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: '600',
    userSelect: 'none',
    transition: 'background-color 0.2s',
  },
  editorWrapper: {
    flexGrow: 1,
    padding: 20,
    overflowY: 'auto',
  },
};

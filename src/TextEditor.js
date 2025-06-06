// Import necessary React and third-party libraries
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import { io } from 'socket.io-client';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import html2pdf from 'html2pdf.js';

// Constants
const SAVE_INTERVAL_MS = 2000; // Auto-save interval in milliseconds
const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];

let socket; // Socket.IO client instance
let quill;  // Quill editor instance

export default function TextEditor() {
  const { id: documentId } = useParams(); // Get document ID from URL
  const navigate = useNavigate(); // Navigation hook

  const [darkMode, setDarkMode] = useState(false); // State for dark mode
  const [tabs, setTabs] = useState(() => {
    // Initialize tabs from localStorage or use current documentId
    const saved = localStorage.getItem('tabs');
    return saved ? JSON.parse(saved) : [documentId];
  });

  // === Tab Handling ===

  // Create a new document tab
  const handleNewTab = () => {
    const newId = uuidV4(); // Generate unique ID
    const newTabs = [...tabs, newId];
    setTabs(newTabs);
    localStorage.setItem('tabs', JSON.stringify(newTabs));
    navigate(`/documents/${newId}`); // Navigate to new document
  };

  // Switch between tabs
  const handleSwitchTab = (tabId) => navigate(`/documents/${tabId}`);

  // Remove a document tab
  const handleRemoveTab = (tabId) => {
    const newTabs = tabs.filter(t => t !== tabId);
    setTabs(newTabs);
    localStorage.setItem('tabs', JSON.stringify(newTabs));

    // If the current tab is removed, switch to another or create new
    if (tabId === documentId) {
      if (newTabs.length) navigate(`/documents/${newTabs[0]}`);
      else {
        const freshId = uuidV4();
        setTabs([freshId]);
        navigate(`/documents/${freshId}`);
      }
    }
  };

  // === Dark Mode Toggle ===
  const toggleDarkMode = () => {
    setDarkMode((d) => !d);
    document.body.classList.toggle('dark-mode');
  };

  // === Editor Actions ===

  // Undo action
  const handleUndo = () => quill?.history.undo();

  // Redo action
  const handleRedo = () => quill?.history.redo();

  // Export the document content as PDF
  const exportToPDF = () => {
    const content = document.querySelector('.ql-editor');
    if (content) html2pdf().from(content).save('document.pdf');
  };

  // Manually save document to server
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

  // === Initialize Quill Editor ===
  const wrapperRef = useCallback((wrapper) => {
    if (!wrapper) return;
    wrapper.innerHTML = ''; // Clear any existing content
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

  // === Setup Socket Connection ===

  // Establish socket connection on mount
  useEffect(() => {
    socket = io('http://localhost:5000');
    return () => socket.disconnect();
  }, []);

  // Load document content when ready
  useEffect(() => {
    if (!quill) return;
    socket.once('load-document', (doc) => {
      const localDoc = localStorage.getItem(documentId);
      quill.setContents(localDoc ? JSON.parse(localDoc) : doc);
      quill.enable(); // Enable editor after loading
    });
    socket.emit('get-document', documentId);
  }, [documentId]);

  // Listen for remote text changes
  useEffect(() => {
    if (!quill || !socket) return;
    const handleReceive = (delta) => quill.updateContents(delta);
    socket.on('receive-changes', handleReceive);
    return () => socket.off('receive-changes', handleReceive);
  }, []);

  // Emit text changes made by the user
  useEffect(() => {
    if (!quill || !socket) return;
    const handleSend = (delta, oldDelta, source) => {
      if (source === 'user') socket.emit('send-changes', delta);
    };
    quill.on('text-change', handleSend);
    return () => quill.off('text-change', handleSend);
  }, []);

 
  // === UI Rendering ===
  return (
    <div className={`text-editor-container ${darkMode ? 'dark-mode' : ''}`} style={styles.container}>
      {/* Sidebar for tab navigation */}
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
            {/* Switch to document tab */}
            <button
              style={styles.tabButton}
              onClick={() => handleSwitchTab(tabId)}
              title={`Document ${idx + 1}`}
            >
              📄 Doc {idx + 1}
            </button>
            {/* Remove tab */}
            <button style={styles.closeBtn} onClick={() => handleRemoveTab(tabId)}>
              ✖
            </button>
          </div>
        ))}
        {/* Create a new document tab */}
        <button style={styles.newTabBtn} onClick={handleNewTab}>
          ➕ New Document
        </button>
      </nav>

      {/* Main editor area */}
      <main style={styles.mainArea}>
        {/* Top control bar */}
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

        {/* Quill editor container */}
        <section style={styles.editorWrapper} ref={wrapperRef}></section>
      </main>
    </div>
  );
}

// === CSS-in-JS Styles ===
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

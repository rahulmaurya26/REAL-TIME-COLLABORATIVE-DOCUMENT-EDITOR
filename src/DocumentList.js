
import React, { useEffect, useState } from 'react';
import { useNavigate,Link } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/documents');
      setDocuments(res.data);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createNewDocument = async () => {
    const newId = uuidV4();
    try {
      await axios.post('http://localhost:5000/api/documents', {
        id: newId,
        title: 'Untitled Document',
        data: {},
      });
      navigate(`/documents/${newId}`);
    } catch (err) {
      setError('Failed to create new document');
      console.error(err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/documents/${id}`);
      setDocuments(prev => prev.filter(doc => doc._id !== id));
    } catch (err) {
      alert('Delete failed');
      console.error(err);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-vh-100 py-5 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <div className="container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold">📄 My Documents</h2>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            <button className="btn btn-primary" >
              <Link className="nav-link" to="TextEditor">➕ New Document</Link> </button>
          </div>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="🔍 Search by title..."
          className="form-control mb-4"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Error / Loading */}
        {loading && <p>Loading...</p>}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Document Cards */}
        <div className="row g-4">
          {filteredDocs.length === 0 && !loading && (
            <p>No documents found. Create one to get started.</p>
          )}

          {filteredDocs.map(doc => (
            <div
              className="col-md-4"
              key={doc._id}
              onClick={() => navigate(`/documents/${doc._id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`card h-100 shadow-sm ${darkMode ? 'bg-secondary text-light' : ''}`}>
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title mb-2">
                    {doc.title || 'Untitled Document'}
                  </h5>
                  <p className="card-text small text-muted mt-auto">
                    🕒 {new Date(doc.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {/* Placeholder tags */}
                    <span className="badge bg-info text-dark">Work</span>
                    <span className="badge bg-warning text-dark">Notes</span>
                  </div>
                </div>
                <div className="card-footer text-end">
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={(e) => handleDelete(doc._id, e)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

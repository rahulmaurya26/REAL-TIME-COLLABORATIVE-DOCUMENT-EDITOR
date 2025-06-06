// Import necessary dependencies
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';

export default function DocumentList() {
  // State variables
  const [documents, setDocuments] = useState([]);      // List of documents
  const [loading, setLoading] = useState(true);        // Loading indicator
  const [error, setError] = useState(null);            // Error message
  const [darkMode, setDarkMode] = useState(false);     // Dark mode toggle
  const [searchTerm, setSearchTerm] = useState('');    // Search input
  const navigate = useNavigate();                      // React Router navigation

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch documents from backend
  const fetchDocuments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/documents');
      setDocuments(res.data);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error(err);
    } finally {
      setLoading(false); // Whether success or fail, stop loading spinner
    }
  };

  // Create a new document and navigate to its editor
  const createNewDocument = async () => {
    const newId = uuidV4(); // Generate a unique document ID
    try {
      await axios.post('http://localhost:5000/api/documents', {
        id: newId,
        title: 'Untitled Document',
        data: {},
      });
      navigate(`/documents/${newId}`); // Navigate to the new document editor
    } catch (err) {
      setError('Failed to create new document');
      console.error(err);
    }
  };

  // Handle document deletion
  const handleDelete = async (id, e) => {
    e.stopPropagation();  // Prevent click from bubbling to card (which would navigate)
    e.preventDefault();   // Prevent default action
    if (!window.confirm('Delete this document?')) return; // Confirm before deleting
    try {
      await axios.delete(`http://localhost:5000/api/documents/${id}`);
      // Remove the deleted document from state
      setDocuments(prev => prev.filter(doc => doc._id !== id));
    } catch (err) {
      alert('Delete failed');
      console.error(err);
    }
  };

  // Filter documents based on search input
  const filteredDocs = documents.filter(doc =>
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-vh-100 py-5 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <div className="container">

        {/* === Header with Title and Buttons === */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold">📄 My Documents</h2>
          <div className="d-flex gap-2">
            {/* Toggle dark/light mode */}
            <button className="btn btn-outline-secondary" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            {/* Navigate to new document editor (via link) */}
            <button className="btn btn-primary">
              <Link className="nav-link" to="TextEditor">➕ New Document</Link>
            </button>
          </div>
        </div>

        {/* === Search Input === */}
        <input
          type="text"
          placeholder="🔍 Search by title..."
          className="form-control mb-4"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* === Loading / Error Messages === */}
        {loading && <p>Loading...</p>}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* === Document Cards Grid === */}
        <div className="row g-4">
          {/* No results message */}
          {filteredDocs.length === 0 && !loading && (
            <p>No documents found. Create one to get started.</p>
          )}

          {/* Render each document card */}
          {filteredDocs.map(doc => (
            <div
              className="col-md-4"
              key={doc._id}
              onClick={() => navigate(`/documents/${doc._id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`card h-100 shadow-sm ${darkMode ? 'bg-secondary text-light' : ''}`}>
                <div className="card-body d-flex flex-column">
                  {/* Document title */}
                  <h5 className="card-title mb-2">
                    {doc.title || 'Untitled Document'}
                  </h5>
                  
                  {/* Last modified timestamp */}
                  <p className="card-text small text-muted mt-auto">
                    🕒 {new Date(doc.createdAt).toLocaleString()}
                  </p>

                  {/* Example tags (not dynamic) */}
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    <span className="badge bg-info text-dark">Work</span>
                    <span className="badge bg-warning text-dark">Notes</span>
                  </div>
                </div>

                {/* Delete button */}
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

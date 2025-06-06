// Import required dependencies
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import components
import TextEditor from './TextEditor';
import DocumentList from './DocumentList';

// Import Bootstrap for styling
import 'bootstrap/dist/css/bootstrap.min.css';

export default function App() {
  return (
    <Routes>
      {/* Route for the document list page */}
      <Route path="/documents" element={<DocumentList />} />

      {/* Route for editing a specific document using its ID */}
      <Route path="/documents/:id" element={<TextEditor />} />

      {/* Default route: redirect root path to document list */}
      <Route path="/" element={<Navigate to="/documents" />} />

      {/* Catch-all route: redirect any unknown path to document list */}
      <Route path="*" element={<Navigate to="/documents" />} />
    </Routes>
  );
}

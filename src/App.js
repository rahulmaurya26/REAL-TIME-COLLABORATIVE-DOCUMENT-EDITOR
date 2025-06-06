import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import TextEditor from './TextEditor';
import DocumentList from './DocumentList';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function App() {
  return (
    <Routes>
      <Route path="/documents" element={<DocumentList />} />
      <Route path="/documents/:id" element={<TextEditor />} />
      <Route path="/" element={<Navigate to="/documents" />} />
      <Route path="*" element={<Navigate to="/documents" />} />
    </Routes>
  );
}

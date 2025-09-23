import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PermissionList from './PermissionList';

const PermissionRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PermissionList />} />
    </Routes>
  );
};

export default PermissionRoutes;
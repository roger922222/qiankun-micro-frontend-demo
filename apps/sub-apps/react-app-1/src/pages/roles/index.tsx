import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RoleList from './RoleList';

const RoleRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RoleList />} />
    </Routes>
  );
};

export default RoleRoutes;
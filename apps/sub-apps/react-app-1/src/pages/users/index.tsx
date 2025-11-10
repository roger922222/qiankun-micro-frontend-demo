import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserList from './UserList';
import UserForm from './UserForm';
import UserDetail from './UserDetail';

const UserRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<UserList />} />
      <Route path="/create" element={<UserForm />} />
      <Route path="/edit/:id" element={<UserForm />} />
      <Route path="/:id" element={<UserDetail />} />
    </Routes>
  );
};

export default UserRoutes;
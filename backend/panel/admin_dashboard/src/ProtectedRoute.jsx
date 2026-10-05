import React, { useSyncExternalStore } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession, subscribeSession } from './sessionClient';
export default function ProtectedRoute({ children }) {
 const session = useSyncExternalStore(subscribeSession, getSession);
 return session?.admin ? children : <Navigate to="/login" replace />;
}

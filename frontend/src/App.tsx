import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { RosterProvider } from './context/RosterContext';
import { Layout } from './components/layout/Layout';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RosterGeneratorPage } from './pages/roster/RosterGeneratorPage';
import { CoveragePage } from './pages/coverage/CoveragePage';
import { ConflictsPage } from './pages/conflicts/ConflictsPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { PodsPage } from './pages/pods/PodsPage';
import { BrandsPage } from './pages/brands/BrandsPage';
import { ProcessesPage } from './pages/processes/ProcessesPage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { LeavesHolidaysPage } from './pages/leaves/LeavesHolidaysPage';
import { SettingsPage } from './pages/settings/SettingsPage';

export function App() {
  return (
    <ToastProvider>
      <RosterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="roster" element={<RosterGeneratorPage />} />
              <Route path="coverage" element={<CoveragePage />} />
              <Route path="conflicts" element={<ConflictsPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="pods" element={<PodsPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="processes" element={<ProcessesPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="leaves-holidays" element={<LeavesHolidaysPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RosterProvider>
    </ToastProvider>
  );
}

export default App;

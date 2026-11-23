import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';

describe('Sidebar Navigation Component', () => {
  it('renders application branding and core navigation links', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('RosterIQ')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monthly Roster')).toBeInTheDocument();
    expect(screen.getByText('Coverage Analysis')).toBeInTheDocument();
    expect(screen.getByText('Conflicts Center')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Operational Pods')).toBeInTheDocument();
    expect(screen.getByText('Client Brands')).toBeInTheDocument();
    expect(screen.getByText('Processes')).toBeInTheDocument();
    expect(screen.getByText('Role Assignments')).toBeInTheDocument();
    expect(screen.getByText('Leaves & Holidays')).toBeInTheDocument();
    expect(screen.getByText('Rules & Shifts')).toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../components/common/Badge';

describe('Badge Component', () => {
  it('renders default badge with children text', () => {
    render(<Badge>Active Status</Badge>);
    expect(screen.getByText('Active Status')).toBeInTheDocument();
  });

  it('renders WORKING roster status badge', () => {
    render(<Badge variant="WORKING">W</Badge>);
    const el = screen.getByText('W');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('text-indigo-300');
  });

  it('renders CRITICAL conflict badge with dot indicator', () => {
    render(<Badge variant="CRITICAL" dot>Critical Alert</Badge>);
    expect(screen.getByText('Critical Alert')).toBeInTheDocument();
  });

  it('renders LEAVE and HOLIDAY badges', () => {
    render(
      <div>
        <Badge variant="LEAVE">Approved Leave</Badge>
        <Badge variant="HOLIDAY">Public Holiday</Badge>
      </div>
    );
    expect(screen.getByText('Approved Leave')).toBeInTheDocument();
    expect(screen.getByText('Public Holiday')).toBeInTheDocument();
  });
});

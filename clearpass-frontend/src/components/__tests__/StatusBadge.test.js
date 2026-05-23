import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders "Pending" for pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders "Approved" for approved status', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders "Rejected" for rejected status', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders "In Review" for in_review status', () => {
    render(<StatusBadge status="in_review" />);
    expect(screen.getByText('In Review')).toBeInTheDocument();
  });

  it('renders "Cleared" for cleared status', () => {
    render(<StatusBadge status="cleared" />);
    expect(screen.getByText('Cleared')).toBeInTheDocument();
  });

  it('falls back to "Pending" when status is undefined', () => {
    render(<StatusBadge />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('is case-insensitive for status values', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('uses the default style for unknown statuses', () => {
    render(<StatusBadge status="unknown_state" />);
    // Should still render without crashing
    expect(screen.getByText('Unknown State')).toBeInTheDocument();
  });
});

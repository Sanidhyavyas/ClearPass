import { render, screen } from '@testing-library/react';
import SemesterBadge from '../SemesterBadge';

describe('SemesterBadge', () => {
  it('renders year and semester text', () => {
    render(<SemesterBadge year={3} semester={6} />);
    expect(screen.getByText('Yr 3')).toBeInTheDocument();
    expect(screen.getByText('Sem 6')).toBeInTheDocument();
  });

  it('renders only year when semester is omitted', () => {
    render(<SemesterBadge year={2} />);
    expect(screen.getByText('Yr 2')).toBeInTheDocument();
    expect(screen.queryByText(/Sem/)).toBeNull();
  });

  it('renders only semester when year is omitted', () => {
    render(<SemesterBadge semester={4} />);
    expect(screen.getByText('Sem 4')).toBeInTheDocument();
    expect(screen.queryByText(/Yr/)).toBeNull();
  });

  it('returns null when both year and semester are missing', () => {
    const { container } = render(<SemesterBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('sets a descriptive aria-label', () => {
    const { container } = render(<SemesterBadge year={1} semester={2} />);
    expect(container.firstChild).toHaveAttribute('aria-label', 'Year 1, Semester 2');
  });

  it('applies different gradient colors per year', () => {
    const { container: c1 } = render(<SemesterBadge year={1} semester={1} />);
    const { container: c2 } = render(<SemesterBadge year={2} semester={3} />);
    const class1 = c1.firstChild.className;
    const class2 = c2.firstChild.className;
    // Each year should have a different gradient
    expect(class1).not.toBe(class2);
  });
});

import { render } from '@testing-library/react';
import {
  SkeletonLine,
  SkeletonCircle,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRows,
} from '../LoadingSkeleton';

describe('SkeletonLine', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<SkeletonLine className="h-4 w-32" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the provided className', () => {
    const { container } = render(<SkeletonLine className="h-4 w-32" />);
    expect(container.firstChild.className).toContain('h-4');
    expect(container.firstChild.className).toContain('w-32');
  });
});

describe('SkeletonCircle', () => {
  it('renders a rounded-full element', () => {
    const { container } = render(<SkeletonCircle size="h-8 w-8" />);
    expect(container.firstChild.className).toContain('rounded-full');
  });

  it('applies the provided size class', () => {
    const { container } = render(<SkeletonCircle size="h-8 w-8" />);
    expect(container.firstChild.className).toContain('h-8');
  });
});

describe('SkeletonAvatar', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has aria-hidden set', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonTableRows', () => {
  it('renders the correct number of rows', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRows rows={3} cols={4} />
        </tbody>
      </table>
    );
    const rows = container.querySelectorAll('tr');
    expect(rows).toHaveLength(3);
  });

  it('renders the correct number of columns per row', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRows rows={2} cols={5} />
        </tbody>
      </table>
    );
    const firstRow = container.querySelectorAll('tr')[0];
    expect(firstRow.querySelectorAll('td')).toHaveLength(5);
  });

  it('defaults to 5 rows and 4 cols', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRows />
        </tbody>
      </table>
    );
    expect(container.querySelectorAll('tr')).toHaveLength(5);
    expect(container.querySelectorAll('tr')[0].querySelectorAll('td')).toHaveLength(4);
  });
});

import {
  YEARS,
  SEMESTERS,
  ROLES,
  CLEARANCE_STATUS,
  semestersForYear,
  yearForSemester,
  yearSemLabel,
  ALL_SEMESTER_OPTIONS,
} from './academicConfig';

describe('YEARS and SEMESTERS constants', () => {
  it('YEARS contains exactly [1, 2, 3, 4]', () => {
    expect(YEARS).toEqual([1, 2, 3, 4]);
  });

  it('SEMESTERS contains exactly [1..8]', () => {
    expect(SEMESTERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('ROLES', () => {
  it('contains all four role values', () => {
    expect(ROLES.STUDENT).toBe('student');
    expect(ROLES.TEACHER).toBe('teacher');
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.SUPER_ADMIN).toBe('super_admin');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(ROLES)).toBe(true);
  });
});

describe('CLEARANCE_STATUS', () => {
  it('contains all expected status values', () => {
    expect(CLEARANCE_STATUS.PENDING).toBe('pending');
    expect(CLEARANCE_STATUS.APPROVED).toBe('approved');
    expect(CLEARANCE_STATUS.REJECTED).toBe('rejected');
    expect(CLEARANCE_STATUS.IN_REVIEW).toBe('in_review');
    expect(CLEARANCE_STATUS.CLEARED).toBe('cleared');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(CLEARANCE_STATUS)).toBe(true);
  });
});

describe('semestersForYear', () => {
  it.each([
    [1, [1, 2]],
    [2, [3, 4]],
    [3, [5, 6]],
    [4, [7, 8]],
  ])('year %i returns semesters %j', (year, expected) => {
    expect(semestersForYear(year)).toEqual(expected);
  });
});

describe('yearForSemester', () => {
  it.each([
    [1, 1], [2, 1],
    [3, 2], [4, 2],
    [5, 3], [6, 3],
    [7, 4], [8, 4],
  ])('semester %i belongs to year %i', (semester, expectedYear) => {
    expect(yearForSemester(semester)).toBe(expectedYear);
  });
});

describe('yearSemLabel', () => {
  it('returns a formatted label for valid year and semester', () => {
    expect(yearSemLabel(3, 6)).toBe('Year 3 — Semester 6');
  });

  it('returns "—" when year is null', () => {
    expect(yearSemLabel(null, 6)).toBe('—');
  });

  it('returns "—" when semester is null', () => {
    expect(yearSemLabel(3, null)).toBe('—');
  });

  it('returns "—" when both are null', () => {
    expect(yearSemLabel(null, null)).toBe('—');
  });
});

describe('ALL_SEMESTER_OPTIONS', () => {
  it('contains exactly 8 entries (4 years × 2 semesters)', () => {
    expect(ALL_SEMESTER_OPTIONS).toHaveLength(8);
  });

  it('every entry has year, semester, and label properties', () => {
    ALL_SEMESTER_OPTIONS.forEach((opt) => {
      expect(typeof opt.year).toBe('number');
      expect(typeof opt.semester).toBe('number');
      expect(typeof opt.label).toBe('string');
    });
  });

  it('label for year 2 semester 4 is correct', () => {
    const opt = ALL_SEMESTER_OPTIONS.find((o) => o.year === 2 && o.semester === 4);
    expect(opt).toBeDefined();
    expect(opt.label).toBe('Year 2 — Semester 4');
  });
});

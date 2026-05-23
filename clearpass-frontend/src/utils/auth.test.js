import {
  saveAuth,
  getAuth,
  clearAuth,
  getToken,
  isAuthenticated,
  getRole,
  isStudent,
  isTeacher,
  isAdmin,
  isSuperAdmin,
  getDisplayName,
  getInitials,
} from './auth';

const mockAuth = {
  token: 'test.jwt.token',
  user: { id: 1, name: 'Jane Doe', email: 'jane@example.com', role: 'student' },
};

beforeEach(() => {
  localStorage.clear();
});

describe('saveAuth / getAuth', () => {
  it('persists token and user to localStorage', () => {
    saveAuth(mockAuth);
    const stored = getAuth();
    expect(stored.token).toBe(mockAuth.token);
    expect(stored.user.role).toBe('student');
  });

  it('returns null when localStorage is empty', () => {
    expect(getAuth()).toBeNull();
  });

  it('falls back to legacy keys when clearpass_auth is absent', () => {
    localStorage.setItem('token', 'legacy.token');
    localStorage.setItem('role', 'teacher');
    const auth = getAuth();
    expect(auth.token).toBe('legacy.token');
    expect(auth.user.role).toBe('teacher');
  });

  it('returns null when only stale JSON is in storage', () => {
    localStorage.setItem('clearpass_auth', '{broken json}');
    expect(getAuth()).toBeNull();
  });
});

describe('clearAuth', () => {
  it('removes all auth keys from localStorage', () => {
    saveAuth(mockAuth);
    clearAuth();
    expect(localStorage.getItem('clearpass_auth')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });
});

describe('getToken', () => {
  it('returns the stored token', () => {
    saveAuth(mockAuth);
    expect(getToken()).toBe(mockAuth.token);
  });

  it('returns an empty string when not authenticated', () => {
    expect(getToken()).toBe('');
  });
});

describe('isAuthenticated', () => {
  it('returns true when a token is present', () => {
    saveAuth(mockAuth);
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false when no token is stored', () => {
    expect(isAuthenticated()).toBe(false);
  });
});

describe('getRole', () => {
  it('returns the role from stored auth', () => {
    saveAuth(mockAuth);
    expect(getRole()).toBe('student');
  });

  it('returns an explicit role argument when provided', () => {
    expect(getRole('admin')).toBe('admin');
  });

  it('returns empty string when no auth and no explicit role', () => {
    expect(getRole()).toBe('');
  });
});

describe('role predicate helpers', () => {
  it('isStudent returns true for a student user', () => {
    saveAuth(mockAuth);
    expect(isStudent()).toBe(true);
    expect(isTeacher()).toBe(false);
    expect(isAdmin()).toBe(false);
    expect(isSuperAdmin()).toBe(false);
  });

  it('isAdmin returns true for an admin user', () => {
    saveAuth({ ...mockAuth, user: { ...mockAuth.user, role: 'admin' } });
    expect(isAdmin()).toBe(true);
    expect(isStudent()).toBe(false);
  });

  it('isTeacher returns true for a teacher user', () => {
    saveAuth({ ...mockAuth, user: { ...mockAuth.user, role: 'teacher' } });
    expect(isTeacher()).toBe(true);
  });

  it('isSuperAdmin returns true for a super_admin user', () => {
    saveAuth({ ...mockAuth, user: { ...mockAuth.user, role: 'super_admin' } });
    expect(isSuperAdmin()).toBe(true);
  });
});

describe('getDisplayName', () => {
  it('returns the user display name', () => {
    saveAuth(mockAuth);
    expect(getDisplayName()).toBe('Jane Doe');
  });

  it('returns empty string when no user is stored', () => {
    expect(getDisplayName()).toBe('');
  });
});

describe('getInitials', () => {
  it('returns two-letter uppercase initials for a full name', () => {
    saveAuth(mockAuth);
    expect(getInitials()).toBe('JD');
  });

  it('returns a single letter for a single-word name', () => {
    saveAuth({ ...mockAuth, user: { ...mockAuth.user, name: 'Alice' } });
    expect(getInitials()).toBe('A');
  });

  it('returns "?" when no user name is available', () => {
    expect(getInitials()).toBe('?');
  });

  it('only uses the first two initials for long names', () => {
    saveAuth({ ...mockAuth, user: { ...mockAuth.user, name: 'Anne Marie Clark' } });
    expect(getInitials()).toBe('AM');
  });
});

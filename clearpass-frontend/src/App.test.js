import { render, screen } from '@testing-library/react';
import App from './App';

// Mock page components to keep the test fast and isolated from real API calls
jest.mock('./pages/Login', () => () => <div data-testid="login-page">Sign In</div>);
jest.mock('./pages/Register', () => () => <div data-testid="register-page">Register</div>);
jest.mock('./pages/StudentDashboard', () => () => <div>Student</div>);
jest.mock('./pages/TeacherDashboard', () => () => <div>Teacher</div>);
jest.mock('./pages/AdminDashboard', () => () => <div>Admin</div>);
jest.mock('./pages/SuperAdminDashboard', () => () => <div>SuperAdmin</div>);
jest.mock('./pages/SubjectListPage', () => () => <div>Subjects</div>);
jest.mock('./pages/AcademicStructurePage', () => () => <div>Structure</div>);
jest.mock('./pages/Profile', () => () => <div>Profile</div>);
jest.mock('./pages/Settings', () => () => <div>Settings</div>);

beforeEach(() => {
  localStorage.clear();
});

describe('App routing', () => {
  it('redirects the root path "/" to the Login page when unauthenticated', () => {
    render(<App />);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});

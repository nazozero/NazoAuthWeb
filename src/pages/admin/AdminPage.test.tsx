import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../auth/useAuth';
import AdminPage from './AdminPage';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, apiFetch: vi.fn() };
});

vi.mock('../../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('./RuntimeModulesPanel', () => ({ default: () => <h2>Runtime module controls</h2> }));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedUseAuth = vi.mocked(useAuth);

function renderAdmin(adminLevel: number) {
  mockedUseAuth.mockReturnValue({
    user: {
      id: 'admin-1',
      email: 'admin@example.test',
      role: 'admin',
      admin_level: adminLevel,
      authorized_app_count: 0,
    },
    loading: false,
    sessionChecked: true,
    refreshSession: vi.fn(),
    setUser: vi.fn(),
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  );
}

describe('AdminPage runtime module privilege', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue({ total: 0, page: 1, page_size: 20, items: [] });
  });

  it('hides runtime module controls from level-1 administrators', async () => {
    renderAdmin(1);
    expect(await screen.findByRole('heading', { name: /User management/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Runtime Modules' })).not.toBeInTheDocument();
  });

  it('shows runtime module controls to level-2 administrators', async () => {
    renderAdmin(2);
    expect(await screen.findByRole('button', { name: 'Runtime Modules' })).toBeInTheDocument();
  });
});

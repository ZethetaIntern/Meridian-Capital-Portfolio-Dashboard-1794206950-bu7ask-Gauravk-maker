import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';
const mockedUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute states', () => {
  it('shows loading state while auth is loading', () => {
    mockedUseAuth.mockReturnValue({user:null,loading:true} as ReturnType<typeof useAuth>);
    render(<ProtectedRoute><p>Private dashboard</p></ProtectedRoute>);
    expect(screen.getByText('Loading Meridian Capital...')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });
  it('does not render protected content for signed-out user', () => {
    mockedUseAuth.mockReturnValue({user:null,loading:false} as ReturnType<typeof useAuth>);
    const {container}=render(<ProtectedRoute><p>Private dashboard</p></ProtectedRoute>);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders children for authenticated user', () => {
    mockedUseAuth.mockReturnValue({user:{id:'user-1'},loading:false} as ReturnType<typeof useAuth>);
    render(<ProtectedRoute><p>Private dashboard</p></ProtectedRoute>);
    expect(screen.getByText('Private dashboard')).toBeInTheDocument();
  });
});

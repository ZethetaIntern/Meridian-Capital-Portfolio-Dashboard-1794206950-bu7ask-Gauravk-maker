import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth/AuthContext';

const mocks = vi.hoisted(() => {
  const callback = vi.fn();
  const unsubscribe = vi.fn();
  return {
    callback,
    unsubscribe,
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { auth: {
    getSession: mocks.getSession,
    onAuthStateChange: mocks.onAuthStateChange,
    signUp: mocks.signUp,
    signInWithPassword: mocks.signInWithPassword,
    signOut: mocks.signOut,
    resetPasswordForEmail: mocks.resetPasswordForEmail,
  } },
}));

function Probe() {
  const auth = useAuth();
  return <div>
    <span data-testid="loading">{String(auth.loading)}</span>
    <span data-testid="user">{auth.user?.email ?? 'none'}</span>
    <button onClick={() => auth.signUp('Ada Lovelace', 'ada@example.com', 'secure-pass')}>signup</button>
    <button onClick={() => auth.signIn('ada@example.com', 'secure-pass')}>signin</button>
    <button onClick={() => auth.signOut()}>signout</button>
    <button onClick={() => auth.resetPassword('ada@example.com')}>reset</button>
  </div>;
}

const user = { id: 'u1', email: 'ada@example.com', user_metadata: { full_name: 'Ada Lovelace' } } as any;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
  mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null });
  mocks.signUp.mockResolvedValue({ error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});
afterEach(() => vi.restoreAllMocks());

describe('AuthContext additional coverage', () => {
  it('loads session, reacts to auth changes, and unsubscribes on unmount', async () => {
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => {
  expect(screen.getByTestId('user')).toHaveTextContent('ada@example.com');
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
});
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    const callback = mocks.onAuthStateChange.mock.calls[0][0];
    act(() => callback('SIGNED_OUT', null));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });

  it('forwards signup, signin, signout and password reset requests', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('ada@example.com');
    await act(async () => { screen.getByText('signup').click(); });
    expect(mocks.signUp).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secure-pass', options: { data: { full_name: 'Ada Lovelace' } } });
    await act(async () => { screen.getByText('signin').click(); });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secure-pass' });
    await act(async () => { screen.getByText('signout').click(); });
    expect(mocks.signOut).toHaveBeenCalled();
    await act(async () => { screen.getByText('reset').click(); });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', { redirectTo: `${window.location.origin}/reset-password` });
  });

  it('propagates auth operation errors and logs session lookup errors', async () => {
    const failure = new Error('auth failed');
    mocks.signUp.mockResolvedValue({ error: failure });
    mocks.signInWithPassword.mockResolvedValue({ error: failure });
    mocks.signOut.mockResolvedValue({ error: failure });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: failure });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: failure });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(log).toHaveBeenCalledWith('Session error:', failure));
    // Invoke methods directly to assert their rejected promises.
    let auth!: ReturnType<typeof useAuth>;
    function Capture() { auth = useAuth(); return null; }
    render(<AuthProvider><Capture /></AuthProvider>);
    await expect(auth.signUp('Ada', 'ada@example.com', 'x')).rejects.toThrow('auth failed');
    await expect(auth.signIn('ada@example.com', 'x')).rejects.toThrow('auth failed');
    await expect(auth.signOut()).rejects.toThrow('auth failed');
    await expect(auth.resetPassword('ada@example.com')).rejects.toThrow('auth failed');
  });

  it('throws when useAuth is called outside its provider', () => {
    function Outside() { useAuth(); return null; }
    expect(() => render(<Outside />)).toThrow('useAuth must be used inside AuthProvider');
  });
});

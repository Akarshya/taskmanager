import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const TEST_USER = { email: 'test@example.com', role: 'user' };
const TEST_TOKEN = 'tok-abc123';

function AuthConsumer() {
  const { user, token, isReady, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="ready">{String(isReady)}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <button onClick={() => login(TEST_TOKEN, TEST_USER)}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function renderAuth() {
  render(<AuthProvider><AuthConsumer /></AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());

  it('isReady becomes true after mount', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
  });

  it('starts with no token when localStorage is empty', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(screen.getByTestId('token').textContent).toBe('none');
  });

  it('login sets token and user in state and localStorage', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

    fireEvent.click(screen.getByText('Login'));

    expect(screen.getByTestId('token').textContent).toBe(TEST_TOKEN);
    expect(screen.getByTestId('email').textContent).toBe(TEST_USER.email);
    expect(localStorage.getItem('token')).toBe(TEST_TOKEN);
    expect(JSON.parse(localStorage.getItem('user')).email).toBe(TEST_USER.email);
  });

  it('logout clears token and user from state and localStorage', async () => {
    localStorage.setItem('token', TEST_TOKEN);
    localStorage.setItem('user', JSON.stringify(TEST_USER));

    renderAuth();
    await waitFor(() => expect(screen.getByTestId('token').textContent).toBe(TEST_TOKEN));

    fireEvent.click(screen.getByText('Logout'));

    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(screen.getByTestId('email').textContent).toBe('none');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('restores session from localStorage on mount (auth persists across refresh)', async () => {
    localStorage.setItem('token', TEST_TOKEN);
    localStorage.setItem('user', JSON.stringify(TEST_USER));

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe(TEST_TOKEN);
      expect(screen.getByTestId('email').textContent).toBe(TEST_USER.email);
    });
  });
});

'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface User {
  id: string;
  nick: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; user: User; accessToken: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'SET_TOKEN'; accessToken: string }
  | { type: 'INIT_DONE' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.user,
        accessToken: action.accessToken,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        user: null,
        accessToken: null,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.user,
      };
    case 'SET_TOKEN':
      return {
        ...state,
        accessToken: action.accessToken,
      };
    case 'INIT_DONE':
      return {
        ...state,
        isLoading: false,
      };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setToken: (accessToken: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    accessToken: null,
    isLoading: true,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        dispatch({ type: 'LOGIN', user, accessToken: token });
      } else {
        dispatch({ type: 'INIT_DONE' });
      }
    } catch {
      dispatch({ type: 'INIT_DONE' });
    }
  }, []);

  const login = (user: User, accessToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'LOGIN', user, accessToken });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'UPDATE_USER', user });
  };

  const setToken = (accessToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    dispatch({ type: 'SET_TOKEN', accessToken });
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        ...state,
        login,
        logout,
        updateUser,
        setToken,
      },
    },
    children
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

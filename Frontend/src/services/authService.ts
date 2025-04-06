import { toast } from "sonner";
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_COOKIE_NAME = 'token';
const TOKEN_EXPIRY_DAYS = 7;

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  is_verified: boolean;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserRegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

class AuthService {
  async login(data: UserLoginData): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Login failed');
        return false;
      }

      const result: AuthResponse = await response.json();

      // Store token in cookie with correct settings
      this.setToken(result.access_token);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    }
  }

  async register(data: UserRegisterData): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Registration failed');
        return false;
      }

      toast.success('Registration successful. Please log in.');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getToken();

      if (!token) {
        return null;
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Temporary compatibility method
  getCurrentUserSync(): User | null {
    console.warn('getCurrentUserSync is deprecated. Please use async getCurrentUser() instead.');
    // Return null as a fallback while the async version loads
    return null;
  }

  setToken(token: string): void {
    // Set the cookie with proper attributes
    Cookies.set(TOKEN_COOKIE_NAME, token, {
      expires: TOKEN_EXPIRY_DAYS,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Also set a flag in localStorage to help with client-side auth checks
    // (useful for components that need to know auth status but don't have access to the cookie API)
    localStorage.setItem('isAuthenticated', 'true');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    // Remove both the cookie and localStorage flag
    Cookies.remove(TOKEN_COOKIE_NAME, { path: '/' });
    localStorage.removeItem('isAuthenticated');

    // Redirect to login page
    window.location.href = '/auth/login';
  }

  getToken(): string | null {
    return Cookies.get(TOKEN_COOKIE_NAME) || null;
  }
}

export const authService = new AuthService();
export default authService;

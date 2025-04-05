import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://watchtowerai.onrender.com';

// Default fetch options
const defaultFetchOptions: RequestInit = {
  mode: 'cors',
  credentials: 'include',
  cache: 'no-store'
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  // Add API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'test_api_key';
  headers['X-API-Key'] = apiKey;

  // Add OAuth token from environment variable
  const token = process.env.NEXT_PUBLIC_AUTH_TOKEN || 'demo_token_test';
  if (token && !token.startsWith('Bearer ')) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (token) {
    headers['Authorization'] = token;
  }

  return headers;
};

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/logs`, {
      ...defaultFetchOptions,
      headers: getAuthHeaders(),
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch logs';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching logs' },
      { status: 500 }
    );
  }
}

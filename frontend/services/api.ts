import { Language } from "../types";

// Central API config
// NOTE: Backend base URL is read from environment variables to avoid hard‑coding.
// Prefer EXPO_PUBLIC_API_URL for Expo; fallback to API_URL for other setups.
const API_BASE_URL =
  (typeof process !== "undefined" &&
    (process.env.EXPO_PUBLIC_API_URL || process.env.API_URL)) ||
  "";

if (!API_BASE_URL) {
  // Keeping this as a console warning so it never breaks the UI for farmers.
  // Developers should configure EXPO_PUBLIC_API_URL / API_URL.
  // eslint-disable-next-line no-console
  console.warn(
    "[API] Base URL is not configured. Set EXPO_PUBLIC_API_URL or API_URL."
  );
}

const AUTH_TOKEN_KEY = "kisan_auth_token";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiUser {
  _id: string;
  name: string;
  phone: string;
  role: string;
  language?: Language | string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: ApiUser;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: ApiUser;
}

export interface ProfileResponse {
  message: string;
  user: ApiUser;
}

export interface ApiFarmLocation {
  state: string;
  district: string;
  village: string;
}

export interface ApiFarm {
  _id: string;
  location: ApiFarmLocation;
  landsize: number;
  soiltype: string;
  irrigationtype: string;
  cropsgrown: string[];
}

export interface ApiFarmsResponse {
  farms: ApiFarm[];
}

export interface ApiFarmCreatePayload {
  location: ApiFarmLocation;
  landsize: number;
  soiltype: string;
  irrigationtype: string;
  cropsgrown: string[];
}

export interface ApiFarmCreateResponse {
  message: string;
  farm: ApiFarm;
}

export interface ApiFarmUpdateResponse {
  message: string;
  farm: ApiFarm;
}

export interface ApiGenericMessage {
  message: string;
}

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const saveToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (!token) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    // If storage fails, do not surface a technical error to the farmer.
  }
};

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown
): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = getStoredToken();
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    // Try to read a friendly message from the backend, but never expose raw errors to users.
    let backendMessage: string | undefined;
    try {
      const data = await response.json();
      backendMessage = data?.message;
    } catch {
      // ignore
    }

    const error = new Error(
      backendMessage || "Something went wrong while talking to the server."
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  // Some endpoints may return 204 (no content).
  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export const authService = {
  getStoredToken,
  saveToken,

  async login(phone: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>("/auth/login", "POST", {
      phone,
      password,
    });
    // Persist token for subsequent calls
    saveToken(data.token);
    return data;
  },

  async register(
    name: string,
    phone: string,
    password: string,
    language?: Language
  ): Promise<RegisterResponse> {
    const data = await request<RegisterResponse>("/auth/register", "POST", {
      name,
      phone,
      password,
      // default to farmer-friendly role on backend if not provided
      role: "farmer",
      language,
    });
    saveToken(data.token);
    return data;
  },

  async logout(): Promise<ApiGenericMessage> {
    const res = await request<ApiGenericMessage>("/auth/logout", "POST");
    saveToken(null);
    return res;
  },

  async fetchProfile(): Promise<ProfileResponse> {
    return request<ProfileResponse>("/auth/profile", "GET");
  },
};

export const farmService = {
  async getFarms(): Promise<ApiFarmsResponse> {
    return request<ApiFarmsResponse>("/farmer/farms", "GET");
  },

  async createFarm(
    payload: ApiFarmCreatePayload
  ): Promise<ApiFarmCreateResponse> {
    return request<ApiFarmCreateResponse>("/farmer/farm", "POST", payload);
  },

  async updateFarm(
    id: string,
    updates: Partial<ApiFarmCreatePayload>
  ): Promise<ApiFarmUpdateResponse> {
    return request<ApiFarmUpdateResponse>(`/farmer/farm/${id}`, "PUT", updates);
  },

  async deleteFarm(id: string): Promise<ApiGenericMessage> {
    return request<ApiGenericMessage>(`/farmer/farm/${id}`, "DELETE");
  },
};


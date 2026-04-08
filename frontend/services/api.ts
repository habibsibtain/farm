import { Language } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export interface OtpChallengeResponse {
  message: string;
  challengeId: string;
  phone: string;
}

export interface RegisterOtpRequest {
  name: string;
  phone: string;
  password: string;
  language: string;
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

let inMemoryToken: string | null = null;

const getStoredToken = (): string | null => inMemoryToken;

const saveToken = (token: string | null) => {
  inMemoryToken = token;
};

const bootstrapToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    inMemoryToken = token;
    return token;
  } catch {
    inMemoryToken = null;
    return null;
  }
};

const persistToken = async (token: string | null): Promise<void> => {
  saveToken(token);
  try {
    if (!token) {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    // Storage write failures should not crash the app.
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
  saveToken: persistToken,
  bootstrapToken,

  async login(phone: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>("/auth/login", "POST", {
      phone,
      password,
    });
    await persistToken(data.token);
    return data;
  },

  async requestLoginOtp(
    phone: string,
    password: string
  ): Promise<OtpChallengeResponse> {
    return request<OtpChallengeResponse>("/auth/login/request-otp", "POST", {
      phone,
      password,
    });
  },

  async verifyLoginOtp(
    challengeId: string,
    otp: string
  ): Promise<LoginResponse> {
    const data = await request<LoginResponse>("/auth/login/verify-otp", "POST", {
      challengeId,
      otp,
    });
    await persistToken(data.token);
    return data;
  },

  async requestRegisterOtp(payload: RegisterOtpRequest): Promise<OtpChallengeResponse> {
    return request<OtpChallengeResponse>("/auth/register/request-otp", "POST", payload);
  },

  async resendRegisterOtp(challengeId: string): Promise<OtpChallengeResponse> {
    return request<OtpChallengeResponse>("/auth/register/resend-otp", "POST", {
      challengeId,
    });
  },

  async verifyRegisterOtp(
    challengeId: string,
    otp: string
  ): Promise<RegisterResponse> {
    const data = await request<RegisterResponse>("/auth/register/verify-otp", "POST", {
      challengeId,
      otp,
    });
    await persistToken(data.token);
    return data;
  },

  // Backward compatibility for screens that still call direct register.
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
      role: "farmer",
      language,
    });
    await persistToken(data.token);
    return data;
  },

  async logout(): Promise<ApiGenericMessage> {
    const res = await request<ApiGenericMessage>("/auth/logout", "POST");
    await persistToken(null);
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


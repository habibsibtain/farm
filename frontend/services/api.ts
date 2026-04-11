import { Language } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "auth_token";

// Use ENV (recommended)
const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:4000"; // fallback

if (!API_BASE_URL) {
  console.warn("[API] Base URL is not configured.");
}

// ── Types ──────────────────────────────────────────────────────────────

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

export interface ApiSoilData {
  _id: string;
  farmId: string;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  temperature?: number;
  source: string;
  collectedAt: string;
}

export interface ApiSoilDataResponse {
  message: string;
  soilData: ApiSoilData;
}

export interface ApiSoilDataListResponse {
  soilData: ApiSoilData[];
}

// ── Token Management ──────────────────────────────────────────────────

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
  if (!token) {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  inMemoryToken = token;
};

// ── HTTP Client ───────────────────────────────────────────────────────

type Method = "GET" | "POST" | "PUT" | "DELETE";

const REQUEST_TIMEOUT_MS = 15_000; // 15 second timeout for rural networks

export async function request<T>(
  endpoint: string,
  method: Method,
  body?: any
): Promise<T> {
  const token = getStoredToken();

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Something went wrong");
    }

    return res.json();
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your internet connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Auth Service ──────────────────────────────────────────────────────

export const authService = {
  getStoredToken,
  saveToken: persistToken,
  bootstrapToken,

  async loginWithPassword(phone: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>("/auth/login/password", "POST", {
      phone,
      password,
    });
    await persistToken(data.token);
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

// ── Farm Service ──────────────────────────────────────────────────────

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

// ── Soil Data Service ─────────────────────────────────────────────────

export const soilService = {
  async addSoilData(
    farmId: string,
    payload: Omit<ApiSoilData, "_id" | "farmId" | "collectedAt">
  ): Promise<ApiSoilDataResponse> {
    return request<ApiSoilDataResponse>(`/soil/${farmId}`, "POST", payload);
  },

  async getSoilData(farmId: string): Promise<ApiSoilDataListResponse> {
    return request<ApiSoilDataListResponse>(`/soil/${farmId}`, "GET");
  },
};

// ── Crop Scan Service ─────────────────────────────────────────────────

export interface CropScanPrediction {
  class: string;
  confidence: number;
}

export interface CropScanDiseaseInfo {
  crop?: string;
  disease?: string;
  cause?: string;
  symptoms?: string;
  treatment?: string;
  prevention?: string;
}

export interface CropScanResult {
  success: boolean;
  predicted_class: string;
  confidence: number;
  confidence_percentage: string;
  crop: string;
  disease: string;
  is_healthy: boolean;
  disease_info: CropScanDiseaseInfo;
  top_k_predictions: CropScanPrediction[];
  inference_time_ms: number;
  error?: string;
}

export interface CropScanHealthResponse {
  status: string;
  ml_api: {
    status: string;
    model_loaded: boolean;
    device: string;
  };
}

const CROP_SCAN_TIMEOUT_MS = 30_000; // 30s for GPU inference

export const cropScanService = {
  /**
   * Send a leaf image to the ML model for disease prediction.
   * Uses multipart/form-data (not JSON) since we're uploading a file.
   */
  async predict(imageUri: string): Promise<CropScanResult> {
    const token = getStoredToken();

    const formData = new FormData();

    // React Native / Expo: create file part from URI
    const filename = imageUri.split("/").pop() || "leaf.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("image", {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CROP_SCAN_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE_URL}/crop-scan/predict`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // Do NOT set Content-Type — fetch sets it with the correct boundary
        },
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Crop scan failed");
      }

      return res.json();
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Scan timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Send a base64 image to the ML model.
   * Converts base64 to blob for upload.
   */
  async predictBase64(base64Data: string): Promise<CropScanResult> {
    const token = getStoredToken();

    // Convert base64 to blob
    const byteChars = atob(base64Data);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("image", blob, "leaf.jpg");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CROP_SCAN_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE_URL}/crop-scan/predict`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Crop scan failed");
      }

      return res.json();
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Scan timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /** Check if the ML prediction service is healthy. */
  async checkHealth(): Promise<CropScanHealthResponse> {
    return request<CropScanHealthResponse>("/crop-scan/health", "GET");
  },
};

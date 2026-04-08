export enum AppView {
  HOME = 'HOME',
  CHAT = 'CHAT',
  PEST_DOCTOR = 'PEST_DOCTOR',
  MARKET = 'MARKET',
  PROFILE = 'PROFILE'
}

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr',
  ODIA = 'or',
  PUNJABI = 'pa',
  TELUGU = 'te',
  TAMIL = 'ta',
  KANNADA = 'kn',
  BENGALI = 'bn',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isAudio?: boolean;
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

export interface MarketItem {
  cropName: string;
  price: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  advisory: string;
}

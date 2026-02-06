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
  PUNJABI = 'pa',
  TELUGU = 'te'
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

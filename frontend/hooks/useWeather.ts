import { useEffect, useState } from "react";

const weatherAPIKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

export interface ForecastDay {
  date: Date;
  day: string;       // e.g. "Mon", "Tue"
  min: number;        // °C
  max: number;        // °C
  temp: number;       // average or representative temp in °C
  humidity: number;
  condition: string;  // e.g. "clear sky", "light rain"
  icon: string;       // OpenWeatherMap icon code e.g. "01d"
  // ML model predictions can be added here in the future:
  // mlTemp?: number;
  // mlCondition?: string;
  // mlIcon?: string;
}

export const useWeather = (lat: number, lon: number) => {
  const [weatherdata, setWeatherData] = useState<any>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDayName = (date: Date): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  const fetchWeather = async () => {
    try {

      // CURRENT WEATHER
      const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherAPIKey}&units=metric`
      );
      const currentData = await currentRes.json();

      setWeatherData({
        city: currentData.name,
        temp: currentData.main.temp + 273.15, // Convert to Kelvin for consistency
        humidity: currentData.main.humidity,
        wind: currentData.wind.speed,
        condition: currentData.weather[0].description
      });

      // 7 DAY FORECAST — try OneCall 3.0 first, fallback to free 5-day/3h API
      let dailyForecast: ForecastDay[] = [];

      try {
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${weatherAPIKey}&units=metric&exclude=minutely,hourly`
        );

        if (forecastRes.ok) {
          const forecastData = await forecastRes.json();

          if (forecastData.daily && forecastData.daily.length > 0) {
            dailyForecast = forecastData.daily.slice(0, 7).map((day: any) => {
              const date = new Date(day.dt * 1000);
              return {
                date,
                day: getDayName(date),
                min: Math.round(day.temp.min),
                max: Math.round(day.temp.max),
                temp: Math.round((day.temp.min + day.temp.max) / 2),
                humidity: day.humidity,
                condition: day.weather[0].description,
                icon: day.weather[0].icon,
              };
            });
          }
        }
      } catch {
        // OneCall API failed, will try fallback below
      }

      // Fallback: use free 5-day/3-hour forecast API and aggregate by day
      if (dailyForecast.length === 0) {
        try {
          const fallbackRes = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherAPIKey}&units=metric`
          );
          const fallbackData = await fallbackRes.json();

          if (fallbackData.list && fallbackData.list.length > 0) {
            // Group by date string (YYYY-MM-DD)
            const dayMap = new Map<string, any[]>();
            for (const item of fallbackData.list) {
              const dateStr = item.dt_txt.split(" ")[0];
              if (!dayMap.has(dateStr)) {
                dayMap.set(dateStr, []);
              }
              dayMap.get(dateStr)!.push(item);
            }

            // Convert grouped data to ForecastDay, skip today, take up to 7
            const today = new Date().toISOString().split("T")[0];
            let count = 0;
            for (const [dateStr, items] of dayMap.entries()) {
              if (dateStr === today) continue; // skip today (current weather covers it)
              if (count >= 7) break;

              const temps = items.map((i: any) => i.main.temp);
              const minTemp = Math.round(Math.min(...temps));
              const maxTemp = Math.round(Math.max(...temps));
              // Pick the midday reading for condition/icon (or the middle entry)
              const midEntry = items[Math.floor(items.length / 2)];
              const date = new Date(items[0].dt * 1000);

              dailyForecast.push({
                date,
                day: getDayName(date),
                min: minTemp,
                max: maxTemp,
                temp: Math.round((minTemp + maxTemp) / 2),
                humidity: midEntry.main.humidity,
                condition: midEntry.weather[0].description,
                icon: midEntry.weather[0].icon,
              });
              count++;
            }
          }
        } catch {
          // Fallback also failed — forecast will be empty
        }
      }

      setForecast(dailyForecast);
      setLoading(false);
      setError(null);

    } catch (err) {
      setError("Failed to fetch weather data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); // Refresh every 30 minutes
    return () => clearInterval(interval);
  }, [lat, lon]);

  return { weatherdata, forecast, loading, error };
};
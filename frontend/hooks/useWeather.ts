import { useEffect, useState } from "react";

const weatherAPIKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

export const useWeather = (lat: number, lon: number) => {
  const [weatherdata, setWeatherData] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // 7 DAY FORECAST
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${weatherAPIKey}&units=metric&exclude=minutely,hourly`
      );

      const forecastData = await forecastRes.json();

      const dailyForecast = forecastData.daily.slice(0, 7).map((day: any) => ({
        date: new Date(day.dt * 1000),
        min: day.temp.min,
        max: day.temp.max,
        humidity: day.humidity,
        condition: day.weather[0].description
      }));

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
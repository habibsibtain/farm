import React from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { ForecastDay } from "../../hooks/useWeather";
import { useLanguage } from "../../context/LanguageContext";

interface ForecastRowProps {
  forecast: ForecastDay[];
  /** Optional ML model predictions — when provided, these override the API forecast */
  mlForecast?: ForecastDay[];
}

/**
 * Returns the OpenWeatherMap icon URL for a given icon code.
 * Use @2x for crisp rendering on mobile.
 */
const getIconUrl = (iconCode: string): string =>
  `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

/**
 * 7-day weather forecast row — phone-style layout:
 *   temperature at top, weather icon (circular) in middle, day name at bottom.
 *
 * To plug in ML model predictions in the future:
 *   1. Pass mlForecast prop with the same ForecastDay shape.
 *   2. The component will prefer mlForecast over the API forecast.
 */
const ForecastRow: React.FC<ForecastRowProps> = ({ forecast, mlForecast }) => {
  const { t } = useLanguage();
  const data = mlForecast && mlForecast.length > 0 ? mlForecast : forecast;

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((day, index) => (
          <View key={`${day.day}-${index}`} style={styles.dayColumn}>
            {/* Temperature at top */}
            <Text style={styles.tempText}>{day.max}°</Text>
            <Text style={styles.tempMinText}>{day.min}°</Text>

            {/* Weather icon in circular container */}
            <View style={styles.iconCircle}>
              <Image
                source={{ uri: getIconUrl(day.icon) }}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </View>

            {/* Day name at bottom */}
            <Text style={styles.dayText}>
              {index === 0 ? t("weather.tomorrow") : day.day}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  scrollContent: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
  },
  dayColumn: {
    alignItems: "center",
    minWidth: 58,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tempText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  tempMinText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.65)",
    marginTop: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
});

export default ForecastRow;

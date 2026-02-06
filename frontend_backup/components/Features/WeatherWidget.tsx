import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sun, Wind, Droplets, MapPin } from 'lucide-react-native';
import { Language } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

interface WeatherWidgetProps {
  language: Language;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ language }) => {
  const weather = {
    temp: 28,
    condition: language === Language.HINDI ? 'आंशिक बादल' : 'Partly Cloudy',
    humidity: 65,
    wind: 12,
    location: language === Language.HINDI ? 'बठिंडा, पंजाब' : 'Bathinda, Punjab'
  };

  return (
    <LinearGradient
      colors={['#3b82f6', '#2563eb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#dbeafe" />
            <Text style={styles.locationText}>{weather.location}</Text>
          </View>
          <Text style={styles.tempText}>{weather.temp}°C</Text>
          <Text style={styles.conditionText}>{weather.condition}</Text>
        </View>
        
        <View style={styles.iconCircle}>
          <Sun size={32} color="#fde047" />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.statItem}>
          <Droplets size={18} color="#bfdbfe" />
          <View>
            <Text style={styles.statLabel}>Humidity</Text>
            <Text style={styles.statValue}>{weather.humidity}%</Text>
          </View>
        </View>
        <View style={styles.statItem}>
          <Wind size={18} color="#bfdbfe" />
          <View>
            <Text style={styles.statLabel}>Wind</Text>
            <Text style={styles.statValue}>{weather.wind} km/h</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    color: '#dbeafe',
    fontSize: 14,
  },
  tempText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  conditionText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 50,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#bfdbfe',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  }
});

export default WeatherWidget;

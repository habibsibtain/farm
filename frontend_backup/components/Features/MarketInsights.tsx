import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Sprout, AlertCircle } from 'lucide-react-native';
import { Language, MarketItem } from '../../types';
import { getMarketInsights } from '../../services/geminiService';

interface MarketInsightsProps {
  language: Language;
}

const MarketInsights: React.FC<MarketInsightsProps> = ({ language }) => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchInsights = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getMarketInsights(language);
      if (data && data.length > 0) {
        setItems(data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [language]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp size={20} color="#16a34a" />;
      case 'DOWN': return <TrendingDown size={20} color="#ef4444" />;
      default: return <Minus size={20} color="#94a3b8" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    if (language === Language.HINDI) {
      if (trend === 'UP') return 'बढ़त';
      if (trend === 'DOWN') return 'गिरावट';
      return 'स्थिर';
    }
    return trend;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <TrendingUp size={20} color="#2563eb" />
            </View>
            <Text style={styles.title}>{language === Language.HINDI ? 'मंडी भाव' : 'Mandi Rates'}</Text>
          </View>
          <Text style={styles.subtitle}>
            {language === Language.HINDI ? 'AI द्वारा अनुमानित भाव' : 'AI Estimated Prices • Real-time'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={fetchInsights} 
          disabled={loading}
          style={styles.refreshBtn}
        >
          {loading ? <ActivityIndicator size="small" color="#475569" /> : <RefreshCw size={20} color="#475569" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && items.length === 0 ? (
          <View style={styles.centerContainer}>
             <ActivityIndicator size="large" color="#16a34a" />
             <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : error && items.length === 0 ? (
          <View style={styles.centerContainer}>
            <AlertCircle size={48} color="#cbd5e1" />
            <Text style={styles.errorText}>{language === Language.HINDI ? 'डेटा लोड करने में असमर्थ' : 'Unable to load market data'}</Text>
            <TouchableOpacity onPress={fetchInsights} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {items.map((item, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.bgIcon}>
                  <Sprout size={80} color="#16a34a" opacity={0.1} />
                </View>
                
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cropName}>{item.cropName}</Text>
                    <View style={styles.trendBadge}>
                      {getTrendIcon(item.trend)}
                      <Text style={styles.trendText}>{getTrendLabel(item.trend)}</Text>
                    </View>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{item.price}</Text>
                    <Text style={styles.unit}>INR / Quintal</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.advisory}>
                    <Text style={styles.tipLabel}>💡 {language === Language.HINDI ? 'सुझाव:' : 'Tip:'} </Text>
                    {item.advisory}
                  </Text>
                </View>
              </View>
            ))}
            
            <View style={styles.disclaimerContainer}>
              <Text style={styles.disclaimer}>
                {language === Language.HINDI 
                  ? 'अस्वीकरण: कीमतें अनुमानित हैं और स्थान के अनुसार भिन्न हो सकती हैं।' 
                  : 'Disclaimer: Prices are estimates and may vary by location.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    backgroundColor: '#dbeafe',
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  refreshBtn: {
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
  },
  errorText: {
    marginTop: 10,
    color: '#94a3b8',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
  },
  retryText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bgIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15803d',
  },
  unit: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  advisory: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  tipLabel: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  disclaimerContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 10,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    textAlign: 'center',
  }
});

export default MarketInsights;

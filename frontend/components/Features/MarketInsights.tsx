import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Sprout, AlertCircle,
  BarChart3, Calendar, ShieldCheck, ArrowUpRight, ArrowDownRight, ArrowRight,
} from 'lucide-react-native';
import { Language, MarketItem } from '../../types';
import { getMarketInsights } from '../../services/geminiService';
import { priceForecastService, CropForecast } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface MarketInsightsProps {
  language: Language;
}

const MarketInsights: React.FC<MarketInsightsProps> = ({ language }) => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Price Forecast state
  const [forecasts, setForecasts] = useState<CropForecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(false);
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'forecast'>('current');

  const { t } = useLanguage();

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

  const fetchForecasts = async () => {
    setForecastLoading(true);
    setForecastError(false);
    try {
      const data = await priceForecastService.getAll();
      if (data?.success && data.crops?.length > 0) {
        setForecasts(data.crops);
      } else {
        setForecastError(true);
      }
    } catch (err) {
      setForecastError(true);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [language]);

  useEffect(() => {
    if (activeTab === 'forecast' && forecasts.length === 0) {
      fetchForecasts();
    }
  }, [activeTab]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp size={20} color="#16a34a" />;
      case 'DOWN': return <TrendingDown size={20} color="#b45309" />;
      default: return <Minus size={20} color="#94a3b8" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    if (trend === 'UP') return t('market.trendUp') || 'UP';
    if (trend === 'DOWN') return t('market.trendDown') || 'DOWN';
    return t('market.trendStable') || 'STABLE';
  };

  const getAdvisoryColor = (advisory: string) => {
    if (advisory === 'sell') return '#dc2626';
    if (advisory === 'hold') return '#16a34a';
    return '#f59e0b';
  };

  const getAdvisoryIcon = (advisory: string) => {
    if (advisory === 'sell') return <ArrowDownRight size={14} color="#dc2626" />;
    if (advisory === 'hold') return <ArrowUpRight size={14} color="#16a34a" />;
    return <ArrowRight size={14} color="#f59e0b" />;
  };

  const getAdvisoryLabel = (advisory: string) => {
    if (advisory === 'sell') return t('market.sellNow');
    if (advisory === 'hold') return t('market.hold');
    return t('market.retry');
  };

  const maxForecastPrice = (forecast: CropForecast) => {
    const prices = [forecast.current_price, ...forecast.monthly_forecast.map(m => m.predicted_price)];
    return Math.max(...prices);
  };

  // ─── Current Prices Tab ────────────────────────────────────────────
  const renderCurrentPrices = () => {
    if (loading && items.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }
    if (error && items.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color="#cbd5e1" />
          <Text style={styles.errorText}>
            {t('market.noData')}
          </Text>
          <TouchableOpacity onPress={fetchInsights} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('market.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
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
                <Text style={styles.tipLabel}>
                  {'💡 '}{t('market.tip') || 'Tip:'}{' '}
                </Text>
                {item.advisory}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimer}>
            {t('market.disclaimer') || 'Disclaimer: Prices are estimates and may vary by location.'}
          </Text>
        </View>
      </View>
    );
  };

  // ─── Forecast Tab ──────────────────────────────────────────────────
  const renderForecasts = () => {
    if (forecastLoading && forecasts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            {t('market.loading')}
          </Text>
        </View>
      );
    }
    if (forecastError && forecasts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color="#cbd5e1" />
          <Text style={styles.errorText}>
            {t('market.noData')}
          </Text>
          <TouchableOpacity onPress={fetchForecasts} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('market.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        {forecasts.map((fc) => {
          const isExpanded = expandedCrop === fc.crop;
          const maxP = maxForecastPrice(fc);

          return (
            <TouchableOpacity
              key={fc.crop}
              style={styles.forecastCard}
              onPress={() => setExpandedCrop(isExpanded ? null : fc.crop)}
              activeOpacity={0.7}
            >
              {/* Header Row */}
              <View style={styles.fcHeader}>
                <View style={styles.fcLeft}>
                  <Text style={styles.fcCropName}>
                    {fc.crop_hindi || fc.crop.charAt(0).toUpperCase() + fc.crop.slice(1)}
                  </Text>
                  <View style={[
                    styles.fcTrendBadge,
                    fc.trend === 'UP' && styles.fcTrendUp,
                    fc.trend === 'DOWN' && styles.fcTrendDown,
                  ]}>
                    {getTrendIcon(fc.trend)}
                    <Text style={[
                      styles.fcTrendText,
                      fc.trend === 'UP' && { color: '#15803d' },
                      fc.trend === 'DOWN' && { color: '#b45309' },
                    ]}>
                      {fc.price_change_pct > 0 ? '+' : ''}{fc.price_change_pct}%
                    </Text>
                  </View>
                </View>
                <View style={styles.fcRight}>
                  <Text style={styles.fcCurrentPrice}>
                    {'\u20B9'}{Math.round(fc.current_price)}
                  </Text>
                  <Text style={styles.fcUnit}>/quintal</Text>
                </View>
              </View>

              {/* Advisory Badge */}
              <View style={[styles.fcAdvisoryRow]}>
                <View style={[styles.fcAdvisoryBadge, { borderColor: getAdvisoryColor(fc.advisory) }]}>
                  {getAdvisoryIcon(fc.advisory)}
                  <Text style={[styles.fcAdvisoryText, { color: getAdvisoryColor(fc.advisory) }]}>
                    {getAdvisoryLabel(fc.advisory)}
                  </Text>
                </View>
                <Text style={styles.fcAdvisoryHint}>
                  {fc.advisory_text_hindi || fc.advisory_text}
                </Text>
              </View>

              {/* Expanded: Monthly Forecast */}
              {isExpanded && (
                <View style={styles.fcExpanded}>
                  <View style={styles.fcExpandHeader}>
                    <BarChart3 size={14} color="#64748b" />
                    <Text style={styles.fcExpandTitle}>
                      Monthly Price Forecast
                    </Text>
                  </View>

                  {/* Current price row */}
                  <View style={styles.fcMonthRow}>
                    <Calendar size={12} color="#94a3b8" />
                    <Text style={styles.fcMonthLabel}>
                      Today
                    </Text>
                    <View style={styles.fcBarContainer}>
                      <View
                        style={[
                          styles.fcBar,
                          styles.fcBarCurrent,
                          { width: `${(fc.current_price / maxP) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.fcMonthPrice}>
                      {'\u20B9'}{Math.round(fc.current_price)}
                    </Text>
                  </View>

                  {/* Future months */}
                  {fc.monthly_forecast.map((m, idx) => {
                    const barPct = (m.predicted_price / maxP) * 100;
                    const isUp = m.predicted_price > fc.current_price;
                    return (
                      <View key={idx} style={styles.fcMonthRow}>
                        <Calendar size={12} color="#94a3b8" />
                        <Text style={styles.fcMonthLabel}>{m.month}</Text>
                        <View style={styles.fcBarContainer}>
                          <View
                            style={[
                              styles.fcBar,
                              isUp ? styles.fcBarUp : styles.fcBarDown,
                              { width: `${barPct}%` },
                            ]}
                          />
                        </View>
                        <Text style={[styles.fcMonthPrice, isUp ? styles.fcPriceUp : styles.fcPriceDown]}>
                          {'\u20B9'}{Math.round(m.predicted_price)}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Confidence range */}
                  {fc.monthly_forecast.length > 0 && (
                    <View style={styles.fcConfidence}>
                      <ShieldCheck size={12} color="#94a3b8" />
                      <Text style={styles.fcConfidenceText}>
                        Expected range: 
                        {'\u20B9'}{Math.round(fc.monthly_forecast[fc.monthly_forecast.length - 1].price_low)}
                        {' - '}
                        {'\u20B9'}{Math.round(fc.monthly_forecast[fc.monthly_forecast.length - 1].price_high)}
                      </Text>
                    </View>
                  )}

                  {/* Best sell month */}
                  {fc.best_sell_month && (
                    <View style={styles.fcBestSell}>
                      <Text style={styles.fcBestSellLabel}>
                        Best time to sell:
                      </Text>
                      <Text style={styles.fcBestSellValue}>
                        {fc.best_sell_month} @ {'\u20B9'}{Math.round(fc.best_sell_price || 0)}/q
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Tap hint */}
              {!isExpanded && (
                <Text style={styles.fcTapHint}>
                  Tap for monthly forecast
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimer}>
            {t('market.disclaimer') || 'Disclaimer: These are AI/ML predictions. Actual prices may vary.'}
          </Text>
        </View>
      </View>
    );
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
            <Text style={styles.title}>{t('market.title')}</Text>
          </View>
          <Text style={styles.subtitle}>
            {t('market.subtitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={activeTab === 'current' ? fetchInsights : fetchForecasts}
          disabled={loading || forecastLoading}
          style={styles.refreshBtn}
        >
          {(loading || forecastLoading) ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <RefreshCw size={20} color="#475569" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.tabActive]}
          onPress={() => setActiveTab('current')}
        >
          <Sprout size={14} color={activeTab === 'current' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
            Current Prices
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forecast' && styles.tabActive]}
          onPress={() => setActiveTab('forecast')}
        >
          <BarChart3 size={14} color={activeTab === 'forecast' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'forecast' && styles.tabTextActive]}>
            Price Forecast
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'current' ? renderCurrentPrices() : renderForecasts()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { backgroundColor: '#dbeafe', padding: 6, borderRadius: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  refreshBtn: {
    padding: 10, backgroundColor: '#f8fafc', borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centerContainer: { height: 300, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#64748b' },
  errorText: { marginTop: 10, color: '#94a3b8', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#f0fdf4', borderRadius: 20 },
  retryText: { color: '#16a34a', fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 16,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#2563eb' },

  // Current price cards
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  bgIcon: { position: 'absolute', top: -10, right: -10 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16,
  },
  cropName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, marginTop: 6, alignSelf: 'flex-start',
  },
  trendText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  priceContainer: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: 'bold', color: '#15803d' },
  unit: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  advisory: { fontSize: 14, color: '#475569', lineHeight: 20 },
  tipLabel: { fontWeight: 'bold', color: '#1e293b' },

  disclaimerContainer: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  disclaimer: {
    fontSize: 10, color: '#94a3b8', backgroundColor: '#f1f5f9',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, textAlign: 'center',
  },

  // ── Forecast Card Styles ───────────────────────────────────
  forecastCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  fcHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  fcLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fcCropName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  fcTrendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  fcTrendUp: { backgroundColor: '#dcfce7' },
  fcTrendDown: { backgroundColor: '#fef3c7' },
  fcTrendText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  fcRight: { alignItems: 'flex-end' },
  fcCurrentPrice: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  fcUnit: { fontSize: 10, color: '#94a3b8' },

  fcAdvisoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
  },
  fcAdvisoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  fcAdvisoryText: { fontSize: 11, fontWeight: '700' },
  fcAdvisoryHint: { flex: 1, fontSize: 11, color: '#64748b' },

  fcTapHint: {
    marginTop: 8, fontSize: 11, color: '#94a3b8', textAlign: 'center',
    fontStyle: 'italic',
  },

  // Expanded forecast
  fcExpanded: {
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  fcExpandHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  fcExpandTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },

  fcMonthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  fcMonthLabel: { fontSize: 11, color: '#64748b', width: 60 },
  fcBarContainer: {
    flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden',
  },
  fcBar: { height: '100%', borderRadius: 4 },
  fcBarCurrent: { backgroundColor: '#94a3b8' },
  fcBarUp: { backgroundColor: '#16a34a' },
  fcBarDown: { backgroundColor: '#f59e0b' },
  fcMonthPrice: { fontSize: 12, fontWeight: '700', color: '#334155', width: 65, textAlign: 'right' },
  fcPriceUp: { color: '#16a34a' },
  fcPriceDown: { color: '#b45309' },

  fcConfidence: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f8fafc',
  },
  fcConfidenceText: { fontSize: 11, color: '#94a3b8' },

  fcBestSell: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, backgroundColor: '#f0fdf4', padding: 10, borderRadius: 10,
  },
  fcBestSellLabel: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  fcBestSellValue: { fontSize: 13, color: '#15803d', fontWeight: '800' },
});

export default MarketInsights;

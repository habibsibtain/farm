import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import WeatherWidget from '../Features/WeatherWidget';
import { AppView, Language } from '../../types';
import { MessageSquare, ScanLine, TrendingUp, ChevronRight, Sprout } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';

interface HomeViewProps {
  language: Language;
  setView: (view: AppView) => void;
  userName?: string;
  farmCount?: number;
}

const HomeView: React.FC<HomeViewProps> = ({ language, setView, userName, farmCount }) => {
  const { t } = useLanguage();

  const displayName = userName || t('common.farmer');
  const greeting = t('home.greeting', { name: displayName });

  const cards = [
    {
      id: 'chat',
      title: t('home.cropAdvisory'),
      desc: t('home.cropAdvisoryDesc'),
      icon: MessageSquare,
      iconColor: '#15803d',
      bgColor: '#dcfce7',
      action: () => setView(AppView.CHAT)
    },
    {
      id: 'scan',
      title: t('home.diseaseCheck'),
      desc: t('home.diseaseCheckDesc'),
      icon: ScanLine,
      iconColor: '#c2410c',
      bgColor: '#ffedd5',
      action: () => setView(AppView.PEST_DOCTOR)
    },
    {
      id: 'market',
      title: t('home.marketPrices'),
      desc: t('home.marketPricesDesc'),
      icon: TrendingUp,
      iconColor: '#1d4ed8',
      bgColor: '#dbeafe',
      action: () => setView(AppView.MARKET)
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcome}>{greeting}</Text>
        <Text style={styles.subWelcome}>
          {t('home.subtitle')}
        </Text>
      </View>

      {/* Farm count badge */}
      {farmCount != null && farmCount > 0 && (
        <View style={styles.farmBadge}>
          <Sprout size={16} color="#15803d" />
          <Text style={styles.farmBadgeText}>
            🌾 {t('home.farmsRegistered', { count: farmCount })}
          </Text>
        </View>
      )}

      <WeatherWidget language={language} />

      <Text style={styles.sectionTitle}>
        {t('home.services')}
      </Text>

      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            onPress={card.action}
            style={styles.card}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, { backgroundColor: card.bgColor }]}>
                <card.icon size={24} color={card.iconColor} />
              </View>
              <View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDesc}>{card.desc}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily Tip Card */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>
          {t('home.tipOfDay')}
        </Text>
        <Text style={styles.tipText}>
          {t('home.tip')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  welcome: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subWelcome: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  farmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  farmBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803d',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 5,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    padding: 12,
    borderRadius: 50,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  tipCard: {
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: 20,
    borderRadius: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 22,
  }
});

export default HomeView;

import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from './components/Layout/BottomNav';
import ChatAssistant from './components/Features/ChatAssistant';
import PestDoctor from './components/Features/PestDoctor';
import MarketInsights from './components/Features/MarketInsights';
import HomeView from './components/Views/HomeView';
import { AppView, Language } from './types';
import { Sprout } from 'lucide-react-native';
// Note: You may need to install @react-native-picker/picker for the dropdown, 
// but for simplicity we'll use a custom view or basic touchable here.

const App: React.FC = () => {
  const [currentView, setView] = useState<AppView>(AppView.HOME);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);

  const renderView = () => {
    switch (currentView) {
      case AppView.HOME:
        return <HomeView language={language} setView={setView} />;
      case AppView.CHAT:
        return <ChatAssistant language={language} />;
      case AppView.PEST_DOCTOR:
        return <PestDoctor language={language} />;
      case AppView.MARKET:
        return <MarketInsights language={language} />;
      default:
        return <HomeView language={language} setView={setView} />;
    }
  };

  const toggleLanguage = () => {
    // Simple cycle for demo purposes in RN without complex dropdown UI
    const langs = [Language.ENGLISH, Language.HINDI, Language.PUNJABI, Language.TELUGU];
    const currentIndex = langs.indexOf(language);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Sprout size={28} color="#16a34a" strokeWidth={2.5} />
          <Text style={styles.title}>
            Kisan<Text style={styles.titleHighlight}>Sahayak</Text>
          </Text>
        </View>
        
        <Text onPress={toggleLanguage} style={styles.langButton}>
          {language === Language.ENGLISH ? 'English' : 
           language === Language.HINDI ? 'हिंदी' : 
           language === Language.PUNJABI ? 'ਪੰਜਾਬੀ' : 'తెలుగు'}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {renderView()}
      </View>

      {/* Bottom Navigation */}
      <BottomNav currentView={currentView} setView={setView} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  titleHighlight: {
    color: '#16a34a',
  },
  langButton: {
    fontSize: 14,
    color: '#1e293b',
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingBottom: 60, // Space for bottom nav
  }
});

export default App;

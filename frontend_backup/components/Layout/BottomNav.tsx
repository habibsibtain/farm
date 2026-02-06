import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppView } from '../../types';
import { Home, MessageSquare, ScanLine, TrendingUp } from 'lucide-react-native';

interface BottomNavProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  
  const navItems = [
    { view: AppView.HOME, icon: Home, label: 'Home' },
    { view: AppView.CHAT, icon: MessageSquare, label: 'Sahayak' },
    { view: AppView.PEST_DOCTOR, icon: ScanLine, label: 'Scan' },
    { view: AppView.MARKET, icon: TrendingUp, label: 'Mandi' },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive = currentView === item.view;
        return (
          <TouchableOpacity
            key={item.view}
            onPress={() => setView(item.view)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <item.icon 
              size={24} 
              color={isActive ? '#16a34a' : '#94a3b8'}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    color: '#94a3b8',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#16a34a',
    fontWeight: 'bold',
  }
});

export default BottomNav;

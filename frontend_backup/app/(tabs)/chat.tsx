import React from "react";
import { View, StyleSheet } from "react-native";
import ChatAssistant from "../../components/Features/ChatAssistant";
import AppHeader from "../../components/Layout/AppHeader";
import { useLanguage } from "../../context/LanguageContext";

const ChatScreen: React.FC = () => {
  const { language } = useLanguage();

  return (
    <View style={styles.container}>
      <AppHeader />
      <ChatAssistant language={language} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});

export default ChatScreen;


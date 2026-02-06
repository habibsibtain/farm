/** @types/react is required for these imports */
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  User,
  Bot,
  Trash2,
  Search,
  X,
} from "lucide-react-native";
import * as Speech from "expo-speech";
import { ChatMessage, Language } from "../../types";
import { generateCropAdvisory } from "../../services/geminiService";

interface ChatAssistantProps {
  language: Language;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ language }) => {
  const getInitialMessage = (lang: Language): ChatMessage => ({
    id: "1",
    role: "model",
    text:
      lang === Language.HINDI
        ? "नमस्ते! मैं किसान सहायक हूँ। मैं आपकी फसल की मदद कैसे कर सकता हूँ?"
        : "Namaste! I am Kisan Sahayak. How can I help you with your crops today?",
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    getInitialMessage(language),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!showSearch) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [messages, showSearch]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (showSearch) {
      setShowSearch(false);
      setSearchQuery("");
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const responseText = await generateCropAdvisory(userMsg.text, language);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const title = language === Language.HINDI ? "चैट साफ़ करें" : "Clear Chat";
    const message =
      language === Language.HINDI ? "क्या आप सुनिश्चित हैं?" : "Are you sure?";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: () => {
          setMessages([getInitialMessage(language)]);
          setShowSearch(false);
          setSearchQuery("");
        },
      },
    ]);
  };

  const toggleListening = () => {
    // Note: Expo Go does not support Voice Recognition out of the box without native build or plugins.
    // For this demo, we will simulate or use a placeholder.
    Alert.alert(
      "Voice Input",
      "Voice recognition requires a native development build (e.g., using @react-native-voice/voice).",
    );
  };

  const speakText = (text: string) => {
    Speech.speak(text, {
      language: language === Language.HINDI ? "hi-IN" : "en-IN",
    });
  };

  const renderMessageText = (text: string) => {
    if (!searchQuery.trim() || !showSearch)
      return <Text style={styles.msgText}>{text}</Text>;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

    return (
      <Text style={styles.msgText}>
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <Text key={index} style={styles.highlight}>
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          ),
        )}
      </Text>
    );
  };

  const displayedMessages =
    showSearch && searchQuery.trim()
      ? messages.filter((m) =>
          m.text.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : messages;

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}
      >
        {!isUser && (
          <View style={[styles.avatar, styles.botAvatar]}>
            <Bot size={16} color="#15803d" />
          </View>
        )}

        <View
          style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
        >
          {renderMessageText(item.text)}

          {!isUser && (
            <TouchableOpacity
              onPress={() => speakText(item.text)}
              style={styles.speakerBtn}
            >
              <Volume2 size={14} color="#16a34a" />
            </TouchableOpacity>
          )}
        </View>

        {isUser && (
          <View style={[styles.avatar, styles.userAvatar]}>
            <User size={16} color="#475569" />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Utility Bar */}
      <View style={styles.utilityBar}>
        {showSearch ? (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  language === Language.HINDI
                    ? "बातचीत में खोजें..."
                    : "Search..."
                }
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.searchClearBtn}
                >
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            >
              <Text style={styles.cancelText}>
                {language === Language.HINDI ? "रद्द" : "Cancel"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.utilityTitle}>
              {language === Language.HINDI ? "बातचीत" : "Conversation"}
            </Text>
            <View style={styles.utilityActions}>
              <TouchableOpacity
                onPress={() => setShowSearch(true)}
                style={styles.iconBtn}
              >
                <Search size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearChat}
                style={styles.iconBtn}
              >
                <Trash2 size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={displayedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.inputArea}>
          <TouchableOpacity onPress={toggleListening} style={styles.micBtn}>
            {isListening ? (
              <MicOff size={20} color="#ef4444" />
            ) : (
              <Mic size={20} color="#64748b" />
            )}
          </TouchableOpacity>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              language === Language.HINDI ? "यहाँ लिखें..." : "Type here..."
            }
            style={styles.input}
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.disabledSendBtn,
            ]}
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  utilityBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(248, 250, 252, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  utilityTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  utilityActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  searchClearBtn: {
    position: "absolute",
    right: 8,
    top: 10,
  },
  cancelText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  highlight: {
    backgroundColor: "#fde047",
    color: "#0f172a",
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "100%",
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowBot: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  userAvatar: {
    backgroundColor: "#cbd5e1",
  },
  botAvatar: {
    backgroundColor: "#dcfce7",
  },
  bubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  userBubble: {
    backgroundColor: "#16a34a",
    borderTopRightRadius: 0,
  },
  botBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderTopLeftRadius: 0,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1e293b", // overridden for user bubble via conditional styling if needed, but standard text supports color
  },
  speakerBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    padding: 4,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
  },
  loaderContainer: {
    padding: 10,
    alignItems: "center",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  micBtn: {
    padding: 10,
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: "#16a34a",
    padding: 10,
    borderRadius: 20,
  },
  disabledSendBtn: {
    opacity: 0.5,
  },
});

export default ChatAssistant;

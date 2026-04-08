import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Language } from "../../types";
import {
  farmService,
  ApiFarm,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  LogOut,
  MapPin,
  Sprout,
  PlusCircle,
  Trash2,
} from "lucide-react-native";

interface ProfileViewProps {
  language: Language;
}

const ProfileView: React.FC<ProfileViewProps> = ({ language }) => {
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmsError, setFarmsError] = useState<string | null>(null);
  const [showFarmForm, setShowFarmForm] = useState(false);

  const [landState, setLandState] = useState("");
  const [landDistrict, setLandDistrict] = useState("");
  const [landVillage, setLandVillage] = useState("");
  const [landSize, setLandSize] = useState("");
  const [soilType, setSoilType] = useState<string | null>(null);
  const [irrigationType, setIrrigationType] = useState<string | null>(null);
  const [cropsText, setCropsText] = useState("");
  const [saveFarmLoading, setSaveFarmLoading] = useState(false);
  const [saveFarmError, setSaveFarmError] = useState<string | null>(null);

  const isHindi = language === Language.HINDI;

  const soilOptions = [
    { value: "Alluvial", label: isHindi ? "दोमट / नदी की मिट्टी" : "Alluvial" },
    { value: "Black", label: isHindi ? "काली मिट्टी" : "Black" },
    { value: "Red", label: isHindi ? "लाल मिट्टी" : "Red" },
    { value: "Laterite", label: isHindi ? "लैटराइट" : "Laterite" },
    { value: "Sandy", label: isHindi ? "रेतीली" : "Sandy" },
    { value: "Loamy", label: isHindi ? "लोमी" : "Loamy" },
  ];

  const irrigationOptions = [
    { value: "Canal", label: isHindi ? "नहर" : "Canal" },
    { value: "Tube well", label: isHindi ? "ट्यूबवेल" : "Tube well" },
    { value: "River", label: isHindi ? "नदी" : "River" },
    { value: "Rainfed", label: isHindi ? "केवल बारिश" : "Rainfed" },
    { value: "Sprinkler", label: isHindi ? "स्प्रिंकलर" : "Sprinkler" },
    { value: "Drip", label: isHindi ? "ड्रिप" : "Drip" },
  ];

  const resetFarmForm = () => {
    setLandState("");
    setLandDistrict("");
    setLandVillage("");
    setLandSize("");
    setSoilType(null);
    setIrrigationType(null);
    setCropsText("");
    setSaveFarmError(null);
  };

  const loadFarms = async () => {
    setFarmsError(null);
    setFarmsLoading(true);
    try {
      const data = await farmService.getFarms();
      setFarms(data.farms || []);
    } catch (error) {
      console.error("Error loading farms", error);
      setFarmsError(
        isHindi
          ? "हम अभी आपके खेतों की जानकारी नहीं ला सके। इंटरनेट ठीक होने पर फिर कोशिश करें।"
          : "We couldn't load your farms right now. Please try again when your internet is better."
      );
    } finally {
      setFarmsLoading(false);
    }
  };

  // Load farms when authenticated
  useEffect(() => {
    if (status === "authenticated" && user) {
      void loadFarms();
    }
  }, [status, user]);

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleDeleteFarm = (farmId: string, farmName: string) => {
    Alert.alert(
      isHindi ? "खेत हटाएं" : "Remove farm",
      isHindi
        ? `क्या आप "${farmName}" को हटाना चाहते हैं?`
        : `Are you sure you want to remove "${farmName}"?`,
      [
        { text: isHindi ? "रद्द करें" : "Cancel", style: "cancel" },
        {
          text: isHindi ? "हटाएं" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await farmService.deleteFarm(farmId);
              await loadFarms();
            } catch (error) {
              console.error("Delete farm error", error);
              Alert.alert(
                isHindi ? "त्रुटि" : "Error",
                isHindi
                  ? "खेत हटाने में समस्या हुई। कृपया दोबारा कोशिश करें।"
                  : "Failed to remove the farm. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleSaveFarm = async () => {
    if (
      !landState.trim() ||
      !landDistrict.trim() ||
      !landVillage.trim() ||
      !landSize.trim() ||
      !soilType ||
      !irrigationType ||
      !cropsText.trim()
    ) {
      setSaveFarmError(
        isHindi
          ? "कृपया खेत की सारी जानकारी भरें ताकि हम सही सलाह दे सकें।"
          : "Please fill all details about your land so we can guide you better."
      );
      return;
    }

    const numericSize = Number(landSize);
    if (Number.isNaN(numericSize) || numericSize <= 0) {
      setSaveFarmError(
        isHindi
          ? "भू-क्षेत्र (एकड़ में) सही से भरें।"
          : "Please enter a valid land size (in acres)."
      );
      return;
    }

    setSaveFarmLoading(true);
    setSaveFarmError(null);
    try {
      await farmService.createFarm({
        location: {
          state: landState.trim(),
          district: landDistrict.trim(),
          village: landVillage.trim(),
        },
        landsize: numericSize,
        soiltype: soilType,
        irrigationtype: irrigationType,
        cropsgrown: cropsText
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });

      resetFarmForm();
      setShowFarmForm(false);
      await loadFarms();
    } catch (error) {
      console.error("Save farm error", error);
      setSaveFarmError(
        isHindi
          ? "हम अभी आपका खेत नहीं जोड़ पाए। इंटरनेट ठीक होने पर फिर कोशिश करें।"
          : "We couldn't save your farm right now. Please try again when your internet is stable."
      );
    } finally {
      setSaveFarmLoading(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // Not authenticated — handled by redirect above, show nothing
  if (!user) {
    return null;
  }

  const renderFarmList = () => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>
          {isHindi ? "आपके खेत" : "Your farms"}
        </Text>
        <TouchableOpacity
          onPress={() => {
            resetFarmForm();
            setShowFarmForm(true);
          }}
          style={styles.chipButton}
        >
          <PlusCircle size={16} color="#16a34a" />
          <Text style={styles.chipButtonText}>
            {isHindi ? "खेत जोड़ें" : "Add your farm"}
          </Text>
        </TouchableOpacity>
      </View>

      {farmsLoading && farms.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#16a34a" />
          <Text style={styles.helperText}>
            {isHindi
              ? "आपके खेत लोड हो रहे हैं..."
              : "Loading your farms..."}
          </Text>
        </View>
      ) : farmsError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{farmsError}</Text>
        </View>
      ) : farms.length === 0 ? (
        <View style={styles.emptyState}>
          <Sprout size={36} color="#16a34a" />
          <Text style={styles.emptyTitle}>
            {isHindi ? "अभी कोई खेत नहीं जुड़ा" : "No farms added yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isHindi
              ? "अपने खेत को जोड़ें ताकि मिट्टी और फसल की सलाह हमेशा आपके पास रहे।"
              : "Add your land so soil and crop advice stays saved for you."}
          </Text>
          <TouchableOpacity
            onPress={() => {
              resetFarmForm();
              setShowFarmForm(true);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {isHindi ? "चलें, खेत जोड़ें" : "Let's add your farm"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {farms.map((farm) => (
            <View key={farm._id} style={styles.farmCard}>
              <View style={styles.farmLocationRow}>
                <MapPin size={18} color="#16a34a" />
                <Text style={styles.farmLocationText}>
                  {farm.location.village}, {farm.location.district}
                </Text>
              </View>
              <Text style={styles.farmMeta}>
                {isHindi ? "राज्य: " : "State: "}
                <Text style={styles.farmMetaValue}>
                  {farm.location.state}
                </Text>
              </Text>
              <Text style={styles.farmMeta}>
                {isHindi ? "भूमि: " : "Land: "}
                <Text style={styles.farmMetaValue}>
                  {farm.landsize} {isHindi ? "एकड़" : "acres"}
                </Text>
              </Text>
              <Text style={styles.farmMeta}>
                {isHindi ? "मिट्टी: " : "Soil: "}
                <Text style={styles.farmMetaValue}>{farm.soiltype}</Text>
              </Text>
              <Text style={styles.farmMeta}>
                {isHindi ? "सिंचाई: " : "Irrigation: "}
                <Text style={styles.farmMetaValue}>
                  {farm.irrigationtype}
                </Text>
              </Text>
              <Text style={styles.farmMeta}>
                {isHindi ? "मुख्य फसलें: " : "Main crops: "}
                <Text style={styles.farmMetaValue}>
                  {farm.cropsgrown.join(", ")}
                </Text>
              </Text>

              <View style={styles.farmFooterNote}>
                <View style={styles.farmFooterRow}>
                  <Text style={styles.farmFooterText}>
                    {isHindi
                      ? "जब भी आप सलाह लेंगे, हम इस खेत को ध्यान में रखेंगे।"
                      : "Future advice will gently consider this land's details."}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteFarm(
                        farm._id,
                        `${farm.location.village}, ${farm.location.district}`
                      )
                    }
                    style={styles.deleteFarmBtn}
                  >
                    <Trash2 size={14} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderFarmForm = () => {
    if (!showFarmForm) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isHindi ? "खेत की जानकारी" : "Tell us about your farm"}
        </Text>
        <Text style={styles.cardSubtitle}>
          {isHindi
            ? "छोटे-छोटे चरणों में जानकारी भरें।"
            : "Fill a few simple steps about your land."}
        </Text>

        <Text style={styles.stepLabel}>
          {isHindi ? "चरण 1: जगह" : "Step 1: Location"}
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isHindi ? "राज्य" : "State"}
          </Text>
          <TextInput
            value={landState}
            onChangeText={setLandState}
            placeholder={isHindi ? "जैसे पंजाब" : "e.g. Punjab"}
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isHindi ? "ज़िला" : "District"}
          </Text>
          <TextInput
            value={landDistrict}
            onChangeText={setLandDistrict}
            placeholder={isHindi ? "जैसे बठिंडा" : "e.g. Bathinda"}
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isHindi ? "गाँव" : "Village"}
          </Text>
          <TextInput
            value={landVillage}
            onChangeText={setLandVillage}
            placeholder={isHindi ? "अपने गाँव का नाम" : "Your village name"}
            style={styles.input}
          />
        </View>

        <Text style={styles.stepLabel}>
          {isHindi ? "चरण 2: खेत" : "Step 2: Land"}
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isHindi ? "भू-क्षेत्र (एकड़)" : "Land size (acres)"}
          </Text>
          <TextInput
            value={landSize}
            onChangeText={setLandSize}
            keyboardType="numeric"
            placeholder={isHindi ? "जैसे 2.5" : "e.g. 2.5"}
            style={styles.input}
          />
        </View>

        <View style={styles.chipRow}>
          {soilOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSoilType(option.value)}
              style={[
                styles.chip,
                soilType === option.value && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  soilType === option.value && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chipRow}>
          {irrigationOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setIrrigationType(option.value)}
              style={[
                styles.chip,
                irrigationType === option.value && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  irrigationType === option.value && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.stepLabel}>
          {isHindi ? "चरण 3: फसलें" : "Step 3: Crops"}
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isHindi ? "मुख्य फसलें" : "Main crops"}
          </Text>
          <TextInput
            value={cropsText}
            onChangeText={setCropsText}
            placeholder={
              isHindi
                ? "जैसे गेहूँ, सरसों (कॉमा से अलग करें)"
                : "e.g. Wheat, Mustard (separate with commas)"
            }
            style={styles.input}
          />
        </View>

        {saveFarmError ? (
          <Text style={styles.errorText}>{saveFarmError}</Text>
        ) : null}

        <View style={styles.formActionsRow}>
          <TouchableOpacity
            onPress={() => {
              resetFarmForm();
              setShowFarmForm(false);
            }}
            style={styles.lightButton}
          >
            <Text style={styles.lightButtonText}>
              {isHindi ? "रद्द करें" : "Cancel"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveFarm}
            disabled={saveFarmLoading}
            style={[
              styles.primaryButton,
              styles.primaryButtonCompact,
              saveFarmLoading && styles.primaryButtonDisabled,
            ]}
          >
            {saveFarmLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isHindi ? "खेत सहेजें" : "Save farm"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <User size={22} color="#16a34a" />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {isHindi ? "आपकी प्रोफ़ाइल" : "Your profile"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isHindi
                ? "यह ऐप आपके खेत के लिए आपका साथी है।"
                : "This app stays by your side for your farm."}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <LogOut size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* User Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <User size={28} color="#16a34a" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profilePhone}>{user.phone}</Text>
            <Text style={styles.profileNote}>
              {isHindi
                ? "आपका खाता बन चुका है। अब खेत जोड़कर आगे बढ़ें।"
                : "Your account is ready. Add your land to get better guidance."}
            </Text>
          </View>
        </View>
      </View>

      {renderFarmList()}
      {renderFarmForm()}

      <View style={styles.softInfoCard}>
        <Sprout size={22} color="#16a34a" />
        <Text style={styles.softInfoText}>
          {isHindi
            ? "जल्द ही यहाँ आपकी मिट्टी की रिपोर्ट और सलाह का पूरा इतिहास दिखेगा।"
            : "Soon, this space will gently show your soil reports and past advice in one place."}
        </Text>
      </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonCompact: {
    paddingVertical: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#ecfdf5",
  },
  secondaryButtonText: {
    color: "#15803d",
    fontSize: 14,
    fontWeight: "600",
  },
  lightButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  lightButtonText: {
    color: "#4b5563",
    fontSize: 14,
  },
  errorText: {
    marginTop: 4,
    fontSize: 13,
    color: "#b45309",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  profilePhone: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  profileNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
  },
  chipButtonText: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "600",
  },
  centerBox: {
    alignItems: "center",
    paddingVertical: 16,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  farmCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  farmLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  farmLocationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#14532d",
  },
  farmMeta: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  farmMetaValue: {
    fontWeight: "600",
  },
  farmFooterNote: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  farmFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  farmFooterText: {
    fontSize: 12,
    color: "#6b7280",
    flex: 1,
  },
  deleteFarmBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    marginLeft: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    backgroundColor: "#f9fafb",
  },
  chipActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  chipText: {
    fontSize: 12,
    color: "#4b5563",
  },
  chipTextActive: {
    color: "#14532d",
    fontWeight: "600",
  },
  formActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  softInfoCard: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fefce8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  softInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#854d0e",
  },
});

export default ProfileView;

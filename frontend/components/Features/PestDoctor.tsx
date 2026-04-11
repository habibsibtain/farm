import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Camera,
  X,
  AlertTriangle,
  Bug,
  CheckCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Shield,
  Leaf,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { cropScanService, CropScanResult } from '../../services/api';
import { identifyPestFromImage } from '../../services/geminiService';
import { Language } from '../../types';

interface PestDoctorProps {
  language: Language;
}

const PestDoctor: React.FC<PestDoctorProps> = ({ language }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mlResult, setMlResult] = useState<CropScanResult | null>(null);
  const [geminiText, setGeminiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTopK, setShowTopK] = useState(false);
  const [scanMode, setScanMode] = useState<'ml' | 'ai'>('ml');

  const isHindi = language === Language.HINDI;

  // ── Image Pickers ──────────────────────────────────────────────────

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert(
        isHindi ? 'अनुमति ज़रूरी' : 'Permission needed',
        isHindi
          ? 'कृपया फोटो चुनने की अनुमति दें।'
          : 'Please allow photo access to scan your crop.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      clearResults();
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert(
        isHindi ? 'अनुमति ज़रूरी' : 'Permission needed',
        isHindi
          ? 'कृपया कैमरा की अनुमति दें।'
          : 'Please allow camera access to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      clearResults();
    }
  };

  const clearResults = () => {
    setMlResult(null);
    setGeminiText(null);
    setShowTopK(false);
  };

  const handleClear = () => {
    setImageUri(null);
    setImageBase64(null);
    clearResults();
  };

  // ── Analysis ───────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!imageUri && !imageBase64) return;
    setLoading(true);
    clearResults();

    if (scanMode === 'ml') {
      await analyzeWithML();
    } else {
      await analyzeWithGemini();
    }

    setLoading(false);
  };

  const analyzeWithML = async () => {
    try {
      let result: CropScanResult;

      if (Platform.OS === 'web' && imageBase64) {
        result = await cropScanService.predictBase64(imageBase64);
      } else if (imageUri) {
        result = await cropScanService.predict(imageUri);
      } else {
        throw new Error('No image available');
      }

      setMlResult(result);
    } catch (error: any) {
      console.error('ML scan error:', error);
      // Fallback to gemini if ML API is down
      if (error.message?.includes('not running') || error.message?.includes('503')) {
        Alert.alert(
          isHindi ? 'ML सेवा उपलब्ध नहीं' : 'ML Service Unavailable',
          isHindi
            ? 'AI मोड पर स्विच कर रहे हैं...'
            : 'Switching to AI mode...',
        );
        setScanMode('ai');
        await analyzeWithGemini();
      } else {
        Alert.alert(
          isHindi ? 'त्रुटि' : 'Error',
          error.message || (isHindi ? 'स्कैन विफल हो गया।' : 'Scan failed.'),
        );
      }
    }
  };

  const analyzeWithGemini = async () => {
    if (!imageBase64) {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'कृपया फोटो दोबारा चुनें।' : 'Please re-select the photo.',
      );
      return;
    }

    try {
      const responseText = await identifyPestFromImage(imageBase64, language);
      setGeminiText(responseText);
    } catch {
      setGeminiText(
        isHindi
          ? 'तस्वीर की जाँच अभी पूरी नहीं हो सकी। कृपया दोबारा कोशिश करें।'
          : "We couldn't complete the check. Please try again."
      );
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return '#16a34a';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.85) return isHindi ? 'उच्च विश्वास' : 'High Confidence';
    if (confidence >= 0.6) return isHindi ? 'मध्यम विश्वास' : 'Medium Confidence';
    return isHindi ? 'कम विश्वास' : 'Low Confidence';
  };

  const parseGeminiResponse = (text: string) => {
    const diagMatch = text.match(/DIAGNOSIS:\s*(.+?)(?=TREATMENT:|$)/is);
    const treatMatch = text.match(/TREATMENT:\s*([\s\S]*)/i);
    if (diagMatch && treatMatch) {
      return {
        diagnosis: diagMatch[1].trim(),
        steps: treatMatch[1]
          .trim()
          .split(/\n/)
          .filter((l) => l.trim().length > 0)
          .map((l) => l.replace(/^\d+\.\s*/, '').trim()),
      };
    }
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isHindi ? 'फसल डॉक्टर' : 'Crop Doctor'}
          </Text>
          <Text style={styles.subtitle}>
            {isHindi
              ? 'AI-संचालित रोग पहचान और उपचार'
              : 'AI-Powered Disease Detection & Treatment'}
          </Text>
        </View>

        {/* Scan Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            onPress={() => setScanMode('ml')}
            style={[styles.modeBtn, scanMode === 'ml' && styles.modeBtnActive]}
          >
            <Zap size={16} color={scanMode === 'ml' ? '#fff' : '#64748b'} />
            <Text style={[styles.modeBtnText, scanMode === 'ml' && styles.modeBtnTextActive]}>
              {isHindi ? 'ML मॉडल' : 'ML Model'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScanMode('ai')}
            style={[styles.modeBtn, scanMode === 'ai' && styles.modeBtnActive]}
          >
            <Bug size={16} color={scanMode === 'ai' ? '#fff' : '#64748b'} />
            <Text style={[styles.modeBtnText, scanMode === 'ai' && styles.modeBtnTextActive]}>
              {isHindi ? 'Gemini AI' : 'Gemini AI'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload Area */}
        {!imageUri ? (
          <View style={styles.uploadContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.uploadArea}>
              <View style={styles.iconCircle}>
                <ImagePlus size={32} color="#16a34a" />
              </View>
              <Text style={styles.uploadText}>
                {isHindi ? 'गैलरी से चुनें' : 'Choose from Gallery'}
              </Text>
              <Text style={styles.uploadSubText}>
                {isHindi ? 'पत्ती की साफ तस्वीर चुनें' : 'Select a clear photo of the leaf'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={takePhoto} style={styles.cameraBtn}>
              <Camera size={20} color="#fff" />
              <Text style={styles.cameraBtnText}>
                {isHindi ? 'कैमरा से फोटो लें' : 'Take Photo with Camera'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity onPress={handleClear} style={styles.closeBtn}>
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
              {/* Mode badge */}
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>
                  {scanMode === 'ml' ? 'ML' : 'AI'}
                </Text>
              </View>
            </View>

            {!mlResult && !geminiText && (
              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={loading}
                style={[styles.analyzeBtn, loading && styles.disabledBtn]}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.analyzeBtnText}>
                      {isHindi ? 'जांच हो रही है...' : 'Analyzing...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Shield size={20} color="#fff" />
                    <Text style={styles.analyzeBtnText}>
                      {isHindi ? 'बीमारी पहचानें' : 'Scan for Disease'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ═══ ML Model Result ═══ */}
        {mlResult && (
          <View style={styles.resultCard}>
            {/* Status Header */}
            <View style={[
              styles.resultHeader,
              { backgroundColor: mlResult.is_healthy ? '#f0fdf4' : '#fef2f2' }
            ]}>
              <View style={[
                styles.statusIcon,
                { backgroundColor: mlResult.is_healthy ? '#dcfce7' : '#fee2e2' }
              ]}>
                {mlResult.is_healthy ? (
                  <CheckCircle size={28} color="#16a34a" />
                ) : (
                  <AlertTriangle size={28} color="#dc2626" />
                )}
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={[
                  styles.statusTitle,
                  { color: mlResult.is_healthy ? '#15803d' : '#991b1b' }
                ]}>
                  {mlResult.is_healthy
                    ? (isHindi ? 'स्वस्थ पौधा' : 'Healthy Plant')
                    : (isHindi ? 'रोग पाया गया' : 'Disease Detected')}
                </Text>
                <Text style={styles.cropLabel}>{mlResult.crop}</Text>
              </View>
            </View>

            {/* Disease Name + Confidence */}
            <View style={styles.resultBody}>
              <View style={styles.diseaseBlock}>
                <Text style={styles.sectionLabel}>
                  {isHindi ? 'पहचान' : 'DIAGNOSIS'}
                </Text>
                <Text style={styles.diseaseName}>{mlResult.disease}</Text>

                {/* Confidence bar */}
                <View style={styles.confidenceRow}>
                  <View style={styles.confidenceBarBg}>
                    <View
                      style={[
                        styles.confidenceBarFill,
                        {
                          width: `${mlResult.confidence * 100}%`,
                          backgroundColor: getConfidenceColor(mlResult.confidence),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.confidenceText, { color: getConfidenceColor(mlResult.confidence) }]}>
                    {mlResult.confidence_percentage}
                  </Text>
                </View>
                <Text style={styles.confidenceLabel}>
                  {getConfidenceLabel(mlResult.confidence)}
                </Text>
              </View>

              {/* Disease Info (cause, symptoms, treatment) */}
              {mlResult.disease_info && !mlResult.is_healthy && (
                <View style={styles.infoSection}>
                  {mlResult.disease_info.cause && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>{isHindi ? 'कारण' : 'Cause'}</Text>
                      <Text style={styles.infoText}>{mlResult.disease_info.cause}</Text>
                    </View>
                  )}
                  {mlResult.disease_info.symptoms && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>{isHindi ? 'लक्षण' : 'Symptoms'}</Text>
                      <Text style={styles.infoText}>{mlResult.disease_info.symptoms}</Text>
                    </View>
                  )}
                  {mlResult.disease_info.treatment && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>{isHindi ? 'उपचार' : 'Treatment'}</Text>
                      <Text style={styles.infoText}>{mlResult.disease_info.treatment}</Text>
                    </View>
                  )}
                  {mlResult.disease_info.prevention && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>{isHindi ? 'रोकथाम' : 'Prevention'}</Text>
                      <Text style={styles.infoText}>{mlResult.disease_info.prevention}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Top-K Predictions */}
              {mlResult.top_k_predictions && mlResult.top_k_predictions.length > 1 && (
                <View style={styles.topKSection}>
                  <TouchableOpacity
                    onPress={() => setShowTopK(!showTopK)}
                    style={styles.topKToggle}
                  >
                    <Text style={styles.topKToggleText}>
                      {isHindi ? 'अन्य संभावनाएं' : 'Other Possibilities'}
                    </Text>
                    {showTopK ? (
                      <ChevronUp size={18} color="#64748b" />
                    ) : (
                      <ChevronDown size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>

                  {showTopK && (
                    <View style={styles.topKList}>
                      {mlResult.top_k_predictions.slice(1, 4).map((pred, idx) => (
                        <View key={idx} style={styles.topKItem}>
                          <View style={styles.topKRank}>
                            <Text style={styles.topKRankText}>{idx + 2}</Text>
                          </View>
                          <Text style={styles.topKClass} numberOfLines={1}>
                            {pred.class.replace('___', ' - ').replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.topKConf}>
                            {(pred.confidence * 100).toFixed(1)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Inference time */}
              {mlResult.inference_time_ms && (
                <View style={styles.inferenceRow}>
                  <Zap size={12} color="#94a3b8" />
                  <Text style={styles.inferenceText}>
                    {isHindi ? `${mlResult.inference_time_ms}ms में जांच पूरी` : `Scanned in ${mlResult.inference_time_ms}ms`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ═══ Gemini AI Result ═══ */}
        {geminiText && (
          <View style={styles.resultCard}>
            <View style={[styles.resultHeader, { backgroundColor: '#fffbeb' }]}>
              <View style={styles.statusIcon}>
                <Bug size={24} color="#b45309" />
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>
                  {isHindi ? 'AI जांच परिणाम' : 'AI Analysis Result'}
                </Text>
                <Text style={styles.cropLabel}>Gemini AI</Text>
              </View>
            </View>

            <View style={styles.resultBody}>
              {(() => {
                const parsed = parseGeminiResponse(geminiText);
                if (parsed) {
                  return (
                    <>
                      <View style={styles.diseaseBlock}>
                        <Text style={styles.sectionLabel}>
                          {isHindi ? 'समस्या' : 'PROBLEM DETECTED'}
                        </Text>
                        <Text style={styles.diseaseName}>{parsed.diagnosis}</Text>
                      </View>
                      <View style={styles.infoSection}>
                        <Text style={styles.sectionLabel}>
                          {isHindi ? 'उपचार' : 'TREATMENT'}
                        </Text>
                        {parsed.steps.map((step, idx) => (
                          <View key={idx} style={styles.stepRow}>
                            <View style={styles.stepNum}>
                              <Text style={styles.stepNumText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  );
                }
                return <Text style={styles.rawText}>{geminiText}</Text>;
              })()}
            </View>
          </View>
        )}

        {/* Scan Again button */}
        {(mlResult || geminiText) && (
          <TouchableOpacity onPress={handleClear} style={styles.scanAgainBtn}>
            <Leaf size={18} color="#16a34a" />
            <Text style={styles.scanAgainText}>
              {isHindi ? 'नई फोटो स्कैन करें' : 'Scan Another Leaf'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: '#16a34a' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  modeBtnTextActive: { color: '#ffffff' },

  // Upload
  uploadContainer: { marginBottom: 20 },
  uploadArea: {
    height: 200,
    borderWidth: 2,
    borderColor: '#d1e7dd',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    padding: 16,
    borderRadius: 50,
    backgroundColor: '#dcfce7',
    marginBottom: 12,
  },
  uploadText: { fontSize: 16, fontWeight: '600', color: '#15803d' },
  uploadSubText: { fontSize: 13, color: '#86efac', marginTop: 4 },

  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
  },
  cameraBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Preview
  previewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrapper: {
    height: 220,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
  },
  modeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  analyzeBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  disabledBtn: { opacity: 0.7 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Result card
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusIcon: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 18, fontWeight: '800' },
  cropLabel: { fontSize: 13, color: '#64748b', marginTop: 2 },

  resultBody: { padding: 20 },

  // Disease block
  diseaseBlock: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  diseaseName: { fontSize: 22, fontWeight: '800', color: '#0f172a' },

  // Confidence bar
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  confidenceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  confidenceBarFill: { height: '100%', borderRadius: 4 },
  confidenceText: { fontSize: 16, fontWeight: '800' },
  confidenceLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

  // Disease info
  infoSection: { marginBottom: 16 },
  infoItem: {
    marginBottom: 14,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoText: { fontSize: 14, color: '#334155', lineHeight: 21 },

  // Top-K
  topKSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  topKToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  topKToggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  topKList: { marginTop: 10 },
  topKItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  topKRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topKRankText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  topKClass: { flex: 1, fontSize: 13, color: '#475569' },
  topKConf: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

  // Inference
  inferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inferenceText: { fontSize: 12, color: '#94a3b8' },

  // Gemini result reuse
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },
  stepText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },
  rawText: { color: '#334155', fontSize: 14, lineHeight: 20 },

  // Scan again
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#dcfce7',
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
  },
  scanAgainText: { fontSize: 15, fontWeight: '600', color: '#16a34a' },
});

export default PestDoctor;

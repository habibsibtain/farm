import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Camera, X, AlertTriangle, ScanLine, Bug } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { identifyPestFromImage } from '../../services/geminiService';
import { Language } from '../../types';

interface PestDoctorProps {
  language: Language;
}

const PestDoctor: React.FC<PestDoctorProps> = ({ language }) => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ diagnosis: string, treatment: string[] } | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // Ask for permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant camera roll permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setResult(null);
      setRawText(null);
    }
  };
  
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
     if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant camera permissions!");
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setResult(null);
      setRawText(null);
    }
  }

  const parseResponse = (text: string) => {
    const diagnosisMatch = text.match(/DIAGNOSIS:\s*(.+?)(?=TREATMENT:|$)/is);
    const treatmentMatch = text.match(/TREATMENT:\s*([\s\S]*)/i);

    if (diagnosisMatch && treatmentMatch) {
      const diagnosis = diagnosisMatch[1].trim();
      const treatmentText = treatmentMatch[1].trim();
      const steps = treatmentText.split(/\n/).filter(line => line.trim().length > 0).map(line => line.replace(/^\d+\.\s*/, '').trim());
      setResult({ diagnosis, treatment: steps });
    } else {
      setRawText(text);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setLoading(true);
    const base64Data = image.split(',')[1];
    
    try {
      const responseText = await identifyPestFromImage(base64Data, language);
      parseResponse(responseText);
    } catch (error) {
      setRawText("Error analyzing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
    setRawText(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
           <Text style={styles.title}>
            {language === Language.HINDI ? 'फसल डॉक्टर' : 'Crop Doctor'}
           </Text>
           <Text style={styles.subtitle}>
             {language === Language.HINDI ? 'रोग पहचान और उपचार' : 'Disease Detection & Treatment'}
           </Text>
        </View>

        {/* Upload Area */}
        {!image ? (
          <TouchableOpacity onPress={pickImage} onLongPress={takePhoto} style={styles.uploadArea}>
            <View style={styles.iconCircle}>
              <Camera size={32} color="#94a3b8" />
            </View>
            <Text style={styles.uploadText}>
              {language === Language.HINDI ? 'फोटो अपलोड करें' : 'Upload Photo'}
            </Text>
            <Text style={styles.uploadSubText}>
              {language === Language.HINDI ? 'टैप करें (लंबे समय तक दबाने पर कैमरा)' : 'Tap to upload (Long press for camera)'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.previewContainer}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity onPress={handleClear} style={styles.closeBtn}>
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {!result && !rawText && (
              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={loading}
                style={[styles.analyzeBtn, loading && styles.disabledBtn]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <Bug size={20} color="#fff"/>
                    <Text style={styles.analyzeBtnText}>
                      {language === Language.HINDI ? 'बीमारी पहचानें' : 'Identify Disease'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results Section */}
        {(result || rawText) && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.warningIcon}>
                <AlertTriangle size={24} color="#ef4444" />
              </View>
              <Text style={styles.resultTitle}>
                {language === Language.HINDI ? 'जांच परिणाम' : 'Diagnosis Result'}
              </Text>
            </View>
            
            <View style={styles.resultContent}>
              {result ? (
                <>
                  <View style={styles.mb6}>
                    <Text style={styles.sectionLabel}>
                      {language === Language.HINDI ? 'समस्या' : 'Problem Detected'}
                    </Text>
                    <Text style={styles.diagnosisText}>
                      {result.diagnosis}
                    </Text>
                  </View>
                  
                  <View>
                    <Text style={styles.sectionLabel}>
                      {language === Language.HINDI ? 'उपचार / सुझाव' : 'Recommended Treatment'}
                    </Text>
                    {result.treatment.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={styles.stepNum}>
                          <Text style={styles.stepNumText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.rawText}>{rawText}</Text>
              )}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  uploadArea: {
    height: 250,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    padding: 16,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  uploadSubText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  previewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  imageWrapper: {
    height: 200,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
  },
  analyzeBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  analyzeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
    gap: 12,
  },
  warningIcon: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  resultContent: {
    padding: 20,
  },
  mb6: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  diagnosisText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#15803d',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  rawText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  }
});

export default PestDoctor;

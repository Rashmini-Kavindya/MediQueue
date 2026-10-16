import React, {
  useEffect,
  useRef,
  useState
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons
} from '@expo/vector-icons';
import CaregiverHeader
  from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav
  from '../../components/caregiver/CaregiverBottomNav';
import {
  getPatientSuggestions,
  searchPatient,
  startCaregiverLinkVerification,
  verifyCaregiverLinkOtp
} from '../../services/caregiverApi';
import CaregiverOtpModal
  from '../../components/caregiver/CaregiverOtpModal';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
  greenDark: '#248A3D',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.08)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  chevron: '#C7C7CC',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E9E9EE',
  groupedBg: '#F2F2F7',
  white: '#FFFFFF'
};
const cardShadow = {
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2
};

export default function LinkPatientScreen({
  navigation
}) {
  // ====================================================
  // FORM VALUES
  // ====================================================
  const [name, setName] = useState('');
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  // ====================================================
  // UI STATE
  // ====================================================
  const [focusedInput, setFocusedInput] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [searchStatus, setSearchStatus] = useState('idle');
  const [matchedPatient, setMatchedPatient] = useState(null);
  // PATIENT CONSENT / OTP UI STATE
  const [otpSession, setOtpSession] = useState(null);
  const [linkError, setLinkError] = useState('');
  const suggestionTimer = useRef(null);

  // Direct TextInput refs allow the entire field to receive taps
  // and let the keyboard move naturally between inputs on iOS/Android.
  const nameInputRef = useRef(null);
  const identifierInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  // ====================================================
  // CLEAN UP TIMER
  // ====================================================
  useEffect(() => {
    return () => {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
    };
  }, []);
  // ====================================================
  // RESET VERIFIED / NOT FOUND RESULT
  // ====================================================
  const resetSearchResult = () => {
    setSearchStatus('idle');
    setMatchedPatient(null);
    setLinkError('');
  };
  // ====================================================
  // CLEAR ALL FIELDS
  //
  // Name X clears:
  // - name
  // - NIC / Patient ID
  // - phone
  // - suggestions
  // - selected patient
  // - verification result
  // ====================================================
  const clearAllFields = () => {
    if (suggestionTimer.current) {
      clearTimeout(suggestionTimer.current);
      suggestionTimer.current = null;
    }
    setName('');
    setPatientIdentifier('');
    setPhone('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setMatchedPatient(null);
    setSearchStatus('idle');
    setSuggestionsLoading(false);
    setSearching(false);
    setFocusedInput(null);
    setLinkError('');
  };
  // ====================================================
  // LOAD NAME SUGGESTIONS
  //
  // IMPORTANT:
  // This DOES NOT autofill anything.
  // It only displays possible matching patients.
  // ====================================================
  const loadSuggestions = async (value) => {
    const cleanName = value.trim();
    if (cleanName.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      setSuggestionsLoading(true);
      const response = await getPatientSuggestions(cleanName);
      setSuggestions(response?.data || []);
    } catch (error) {
      console.log(
        'Patient suggestions error:',
        error?.response?.data ||
        error.message
      );
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };
  // ====================================================
  // NAME CHANGE
  // ====================================================
  const handleNameChange = (value) => {
    setName(value);
    resetSearchResult();
    /*
      If a patient had already been selected
      from the suggestions and the caregiver
      starts editing the name again, clear the
      previous auto-filled NIC/ID.
      Phone is kept unless the NAME X is used.
    */
    if (selectedSuggestion) {
      setSelectedSuggestion(null);
      setPatientIdentifier('');
    }
    if (suggestionTimer.current) {
      clearTimeout(suggestionTimer.current);
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    /*
      Debounce so we don't call the API
      after every individual key immediately.
    */
    suggestionTimer.current = setTimeout(
      () => {
        loadSuggestions(value);
      },
      400
    );
  };
  // ====================================================
  // SELECT A PATIENT SUGGESTION
  //
  // ONLY AFTER THIS CLICK:
  // - full name auto-fills
  // - NIC auto-fills
  // ====================================================
  const handleSelectSuggestion = (patient) => {
    setSelectedSuggestion(patient);
    setName(
      `${patient.firstName || ''} ${patient.lastName || ''}`
        .trim()
    );
    /*
      Prefer NIC because that is what your
      high-fidelity field expects.
      Fall back to Patient ID if NIC doesn't exist.
    */
    if (patient.nic) {
      setPatientIdentifier(patient.nic);
    } else if (patient.patientId) {
      setPatientIdentifier(patient.patientId);
    }
    setSuggestions([]);
    setSuggestionsLoading(false);
    setSearchStatus('idle');
    setMatchedPatient(null);
  };
  // ====================================================
  // IDENTIFIER CHANGE
  // ====================================================
  const handleIdentifierChange = (value) => {
    setPatientIdentifier(value);
    resetSearchResult();
  };
  // ====================================================
  // PHONE CHANGE
  // ====================================================
  const handlePhoneChange = (value) => {
    setPhone(value);
    setLinkError('');
    // Keep the verified patient and LINK PATIENT button visible.
    // The backend checks that the entered number matches the patient
    // before it sends an OTP, so the link is still protected.
    if (searchStatus !== 'found' || !matchedPatient) {
      resetSearchResult();
    }
  };
  // ====================================================
  // EXPLICIT SEARCH / VERIFY PATIENT
  //
  // Verification only happens when caregiver
  // presses SEARCH PATIENT.
  // ====================================================
  const handleSearch = async () => {
    Keyboard.dismiss();
    const cleanName = name.trim();
    const cleanIdentifier = patientIdentifier.trim();
    const cleanPhone = phone.trim();
    if (
      !cleanName &&
      !cleanIdentifier
    ) {
      Alert.alert(
        'Patient Details Required',
        'Please enter the patient name or Patient ID/NIC.'
      );
      return;
    }
    try {
      setSearching(true);
      setSuggestions([]);
      setMatchedPatient(null);
      const response = await searchPatient({
        name: cleanName,
        patientIdentifier: cleanIdentifier,
        phone: cleanPhone
      });
      if (
        response?.success &&
        response?.data
      ) {
        const patient = response.data;
        setMatchedPatient(patient);
        setSelectedSuggestion(patient);
        setName(
          `${patient.firstName || ''} ${patient.lastName || ''}`
            .trim()
        );
        if (patient.nic) {
          setPatientIdentifier(patient.nic);
        } else if (patient.patientId) {
          setPatientIdentifier(patient.patientId);
        }
        setSearchStatus('found');
        return;
      }
      setSearchStatus('notFound');
    } catch (error) {
      console.log(
        'Patient search error:',
        error?.response?.data ||
        error.message
      );
      if (error?.response?.status === 404) {
        setSearchStatus('notFound');
        setMatchedPatient(null);
      } else if (error?.response?.status === 409) {
        setSearchStatus('idle');
        Alert.alert(
          'More Details Required',
          error?.response?.data?.message ||
          'More than one patient matched. Please select the correct patient or enter additional details.'
        );
      } else {
        setSearchStatus('idle');
        Alert.alert(
          'Search Failed',
          error?.response?.data?.message ||
          'Unable to search for the patient.'
        );
      }
    } finally {
      setSearching(false);
    }
  };
  // ====================================================
  // LINK PATIENT - START SMS / APP CONSENT VERIFICATION
  // ====================================================
  const handleLink = async () => {
    if (!matchedPatient?.patientId || linking) {
      return;
    }
    const enteredPhone = phone.trim();
    if (!enteredPhone) {
      setLinkError("Please enter the patient's registered phone number before linking.");
      return;
    }
    const digits = enteredPhone.replace(/\D/g, '');
    if (!/^07\d{8}$/.test(digits) && !/^947\d{8}$/.test(digits)) {
      setLinkError('Please enter a valid Sri Lankan mobile number, e.g. 0771234567.');
      return;
    }
    try {
      setLinking(true);
      setLinkError('');
      const response = await startCaregiverLinkVerification({
        patientId: matchedPatient.patientId,
        phone: enteredPhone,
        relationship: 'Caregiver'
      });
      if (!response?.success || !response?.data?.verificationId) {
        throw new Error(response?.message || 'Unable to start consent verification.');
      }
      // Open popup only after backend accepts the SMS request.
      setOtpSession(response.data);
    } catch (error) {
      setLinkError(
        error?.response?.data?.message ||
        error?.message ||
        'Could not send a verification code. Please try again.'
      );
    } finally {
      setLinking(false);
    }
  };
  // ====================================================
  // VERIFY SMS / APP CONSENT CODE
  // ====================================================
  const handleVerifyOtp = async (otp) => {
    if (!otpSession?.verificationId) {
      throw new Error('Verification session was not found. Please request a new code.');
    }
    // The backend alone validates the OTP and activates the link.
    return verifyCaregiverLinkOtp({
      verificationId: otpSession.verificationId,
      otp
    });
  };
  // ====================================================
  // RESEND CONSENT CODE (BACKEND CONTROLS COOLDOWN)
  // ====================================================
  const handleResendOtp = async () => {
    if (!matchedPatient?.patientId || !phone.trim()) {
      throw new Error('Patient details have changed. Please search again.');
    }
    const response = await startCaregiverLinkVerification({
      patientId: matchedPatient.patientId,
      phone: phone.trim(),
      relationship: 'Caregiver'
    });
    if (!response?.success || !response?.data?.verificationId) {
      throw new Error(response?.message || 'Unable to resend verification code.');
    }
    setOtpSession(response.data);
  };
  const handleCloseOtp = () => {
    setOtpSession(null);
  };
  const handleLinkFinished = () => {
    setOtpSession(null);
    clearAllFields();
    navigation.navigate('CaregiverHome');
  };
  // ====================================================
  // SEARCH AGAIN
  // ====================================================
  const handleSearchAgain = () => {
    setSearchStatus('idle');
    setMatchedPatient(null);
  };
  // ====================================================
  // INPUT BORDER HELPER
  // ====================================================
  const getInputStyle = inputName => [
    styles.inputContainer,
    focusedInput === inputName &&
      styles.inputContainerFocused
  ];
  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        {/* HEADER */}
        <CaregiverHeader
          title="Add / Link Patient"
          navigation={navigation}
          showBack
          onBack={() =>
            navigation.navigate('CaregiverHome')
          }
        />
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          {/* PAGE INTRO */}
          <Text style={styles.title}>
            Link Patient Record
          </Text>
          <Text style={styles.description}>
            Enter the patient's name, Patient ID or NIC, and registered phone number to securely search the hospital records.
          </Text>
          {/* PATIENT NAME */}
          <Text style={styles.inputLabel}>
            PATIENT NAME
          </Text>
          <Pressable
            accessible={false}
            onPress={() => nameInputRef.current?.focus()}
            style={getInputStyle('name')}
          >
            <Ionicons
              pointerEvents="none"
              name="person-outline"
              size={20}
              color={
                focusedInput === 'name'
                  ? IOS.blue
                  : IOS.tertiaryLabel
              }
            />
            <TextInput
              ref={nameInputRef}
              editable={true}
              showSoftInputOnFocus={true}
              keyboardType="default"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => identifierInputRef.current?.focus()}
              value={name}
              onChangeText={handleNameChange}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Name"
              placeholderTextColor="#8E8E93"
              autoCapitalize="words"
              selectionColor="#7AB8FF"
              cursorColor={IOS.blue}
              style={[styles.input, Platform.OS === 'web' && styles.webInput]}
            />
            {suggestionsLoading ? (
              <ActivityIndicator
                size="small"
                color={IOS.tertiaryLabel}
              />
            ) : name.length > 0 ? (
              <TouchableOpacity
                onPress={(event) => {
                  event?.stopPropagation?.();
                  clearAllFields();
                }}
                activeOpacity={0.7}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={IOS.chevron}
                />
              </TouchableOpacity>
            ) : null}
          </Pressable>
          {/* MATCHING NAME RESULTS */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              <Text style={styles.suggestionsTitle}>
                MATCHING PATIENTS
              </Text>
              {suggestions.map(
                (patient, index) => (
                  <TouchableOpacity
                    key={patient.patientId}
                    activeOpacity={0.7}
                    onPress={() =>
                      handleSelectSuggestion(patient)
                    }
                    style={[
                      styles.suggestionRow,
                      index !== suggestions.length - 1 &&
                        styles.suggestionDivider
                    ]}
                  >
                    <View style={styles.suggestionAvatar}>
                      <Text style={styles.suggestionAvatarText}>
                        {patient.firstName?.[0]}
                        {patient.lastName?.[0]}
                      </Text>
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName}>
                        {patient.firstName}{' '}
                        {patient.lastName}
                      </Text>
                      <Text style={styles.suggestionPatientId}>
                        Patient ID:{' '}
                        {patient.patientId}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={IOS.chevron}
                    />
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
          {/* PATIENT ID / NIC */}
          <Text style={styles.inputLabel}>
            PATIENT ID / NIC
          </Text>
          <Pressable
            accessible={false}
            onPress={() => identifierInputRef.current?.focus()}
            style={getInputStyle('identifier')}
          >
            <Ionicons
              pointerEvents="none"
              name="card-outline"
              size={20}
              color={
                focusedInput === 'identifier'
                  ? IOS.blue
                  : IOS.tertiaryLabel
              }
            />
            <TextInput
              ref={identifierInputRef}
              editable={true}
              showSoftInputOnFocus={true}
              keyboardType="default"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => phoneInputRef.current?.focus()}
              value={patientIdentifier}
              onChangeText={handleIdentifierChange}
              onFocus={() => setFocusedInput('identifier')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Patient ID or NIC"
              placeholderTextColor="#8E8E93"
              autoCapitalize="characters"
              selectionColor="#7AB8FF"
              cursorColor={IOS.blue}
              style={[styles.input, Platform.OS === 'web' && styles.webInput]}
            />
            {patientIdentifier.length > 0 && (
              <TouchableOpacity
                onPress={(event) => {
                  event?.stopPropagation?.();
                  setPatientIdentifier('');
                  resetSearchResult();
                }}
                activeOpacity={0.7}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={IOS.chevron}
                />
              </TouchableOpacity>
            )}
          </Pressable>
          {/* PHONE */}
          <Text style={styles.inputLabel}>
            PATIENT PHONE NUMBER
          </Text>
          <Pressable
            accessible={false}
            onPress={() => phoneInputRef.current?.focus()}
            style={getInputStyle('phone')}
          >
            <Ionicons
              pointerEvents="none"
              name="call-outline"
              size={20}
              color={
                focusedInput === 'phone'
                  ? IOS.blue
                  : IOS.tertiaryLabel
              }
            />
            <TextInput
              ref={phoneInputRef}
              editable={true}
              showSoftInputOnFocus={true}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              value={phone}
              onChangeText={handlePhoneChange}
              onFocus={() => setFocusedInput('phone')}
              onBlur={() => setFocusedInput(null)}
              placeholder="e.g. 0771234567"
              placeholderTextColor="#8E8E93"
              keyboardType="phone-pad"
              selectionColor="#7AB8FF"
              cursorColor={IOS.blue}
              style={[styles.input, Platform.OS === 'web' && styles.webInput]}
            />
          </Pressable>
          {/* SEARCH BUTTON */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={searching}
            style={styles.searchButton}
            onPress={handleSearch}
          >
            {searching ? (
              <ActivityIndicator
                size="small"
                color={IOS.blue}
              />
            ) : (
              <>
                <Ionicons
                  name="search-outline"
                  size={19}
                  color={IOS.blue}
                />
                <Text style={styles.searchText}>
                  SEARCH PATIENT
                </Text>
              </>
            )}
          </TouchableOpacity>
          {/* MATCH FOUND */}
          {searchStatus === 'found' &&
            matchedPatient && (
            <View style={styles.matchCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordHeaderLeft}>
                  <View style={styles.blueDot} />
                  <Text style={styles.recordLabel}>
                    VERIFIED RECORD
                  </Text>
                </View>
                <View style={styles.matchedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={IOS.blue}
                  />
                  <Text style={styles.matchedText}>
                    Matched
                  </Text>
                </View>
              </View>
              <View style={styles.patientRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {matchedPatient.firstName?.[0]}
                    {matchedPatient.lastName?.[0]}
                  </Text>
                </View>
                <View style={styles.patientDetails}>
                  <Text style={styles.patientName}>
                    {matchedPatient.firstName}{' '}
                    {matchedPatient.lastName}
                  </Text>
                  <Text style={styles.patientDetailText}>
                    Patient ID:{' '}
                    {matchedPatient.patientId}
                  </Text>
                  {matchedPatient.nic ? (
                    <Text style={styles.patientDetailText}>
                      NIC:{' '}
                      {matchedPatient.nic}
                    </Text>
                  ) : null}
                  <View style={styles.activeRow}>
                    <View style={styles.greenDot} />
                    <Text style={styles.activeText}>
                      Active patient record
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.successInfo}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={IOS.greenDark}
                />
                <Text style={styles.successInfoText}>
                  Patient details were verified against the hospital record.
                </Text>
              </View>
            </View>
          )}
          {/* NOT FOUND */}
          {searchStatus === 'notFound' && (
            <View style={styles.notFoundCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordHeaderLeft}>
                  <View style={styles.redDot} />
                  <Text style={styles.recordLabel}>
                    RECORD STATUS
                  </Text>
                </View>
                <View style={styles.noMatchBadge}>
                  <Ionicons
                    name="warning-outline"
                    size={14}
                    color={IOS.red}
                  />
                  <Text style={styles.noMatchText}>
                    No Match Found
                  </Text>
                </View>
              </View>
              <View style={styles.notFoundIcon}>
                <Ionicons
                  name="person-remove-outline"
                  size={28}
                  color={IOS.red}
                />
              </View>
              <Text style={styles.notFoundTitle}>
                No Patient Record Found
              </Text>
              <Text style={styles.notFoundDescription}>
                No active patient matches the details entered. Please check the patient's name, Patient ID/NIC, and registered phone number.
              </Text>
              <View style={styles.recommendations}>
                <Text style={styles.recommendTitle}>
                  RECOMMENDED ACTIONS:
                </Text>
                <Text style={styles.recommendItem}>
                  • Verify the patient's name for typing errors
                </Text>
                <Text style={styles.recommendItem}>
                  • Check the registered phone number
                </Text>
                <Text style={styles.recommendItem}>
                  • Check the Patient ID or NIC
                </Text>
                <Text style={styles.recommendItem}>
                  • Ensure the patient has completed hospital registration
                </Text>
              </View>
            </View>
          )}
          {/* LINK / SEARCH AGAIN */}
          {!!linkError && (
            <View style={styles.linkErrorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color={IOS.red} />
              <Text style={styles.linkErrorText}>{linkError}</Text>
            </View>
          )}
          {searchStatus === 'found' ? (
            <TouchableOpacity
              disabled={linking}
              activeOpacity={0.85}
              onPress={handleLink}
              style={styles.primaryButton}
            >
              {linking ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="link-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>
                    LINK PATIENT
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : searchStatus === 'notFound' ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSearchAgain}
              style={styles.primaryButton}
            >
              <Ionicons
                name="refresh-outline"
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>
                SEARCH AGAIN
              </Text>
            </TouchableOpacity>
          ) : null}
          {/* HELP */}
          <View style={styles.helpRow}>
            <Text style={styles.helpText}>
              Need immediate help?
            </Text>
            <Text style={styles.helpLink}>
              Visit OPD Reception Desk
            </Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
        {/* CHATBOT BUTTON */}
        <TouchableOpacity
          style={styles.chatbot}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="robot-outline"
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        {/* BOTTOM NAV */}
        <CaregiverBottomNav
          navigation={navigation}
          activeRoute=""
        />
        {/* Popup is part of this screen; no new navigation route. */}
        <CaregiverOtpModal
          visible={!!otpSession}
          verification={otpSession}
          patientName={matchedPatient
            ? `${matchedPatient.firstName} ${matchedPatient.lastName}`
            : 'the patient'}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onClose={handleCloseOtp}
          onFinished={handleLinkFinished}
        />
      </View>
    </View>
  );
}
// ======================================================
// STYLES
// ======================================================
const styles = StyleSheet.create({
  linkErrorBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: IOS.redSoft,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  linkErrorText: {
    flex: 1,
    marginLeft: 8,
    color: IOS.red,
    fontSize: 13,
    lineHeight: 18
  },
  outer: {
    flex: 1,
    backgroundColor: IOS.groupedBg
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: IOS.groupedBg
  },
  keyboardArea: {
    flex: 1
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 95
  },
  // PAGE INTRO
  title: {
    color: IOS.label,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: 0.2,
    paddingHorizontal: 4
  },
  description: {
    marginTop: 6,
    marginBottom: 22,
    paddingHorizontal: 4,
    color: IOS.tertiaryLabel,
    fontSize: 14,
    lineHeight: 20
  },
  // FORM LABELS
  inputLabel: {
    marginBottom: 8,
    paddingHorizontal: 6,
    color: IOS.tertiaryLabel,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6
  },
  // INPUT
  inputContainer: {
    minHeight: 54,
    marginBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: IOS.white,
    ...cardShadow
  },
  inputContainerFocused: {
    borderColor: IOS.blue
  },
  input: {
    flex: 1,
    minHeight: 50,
    marginLeft: 10,
    color: IOS.label,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    paddingVertical: 0,
    paddingRight: 4
  },
  webInput: {
    outlineStyle: 'none',
    caretColor: IOS.blue
  },
  clearButton: {
    width: 28,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // PATIENT SUGGESTIONS
  suggestionsCard: {
    marginTop: -8,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: IOS.white,
    ...cardShadow
  },
  suggestionsTitle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: IOS.tertiaryLabel,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    backgroundColor: IOS.surface
  },
  suggestionRow: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: IOS.white
  },
  suggestionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOS.separator
  },
  suggestionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  suggestionAvatarText: {
    color: IOS.blue,
    fontSize: 15,
    fontWeight: '700'
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12
  },
  suggestionName: {
    color: IOS.label,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  suggestionPatientId: {
    marginTop: 3,
    color: IOS.tertiaryLabel,
    fontSize: 12
  },
  // SEARCH BUTTON
  searchButton: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  searchText: {
    marginLeft: 8,
    color: IOS.blue,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  // MATCH CARD
  matchCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    backgroundColor: IOS.white,
    ...cardShadow
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  blueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: IOS.blue
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: IOS.red
  },
  recordLabel: {
    color: IOS.secondaryLabel,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6
  },
  matchedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: IOS.blueSoft
  },
  matchedText: {
    marginLeft: 4,
    color: IOS.blue,
    fontSize: 11,
    fontWeight: '600'
  },
  patientRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  avatarText: {
    color: IOS.blue,
    fontSize: 17,
    fontWeight: '700'
  },
  patientDetails: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    color: IOS.label,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  patientDetailText: {
    marginTop: 3,
    color: IOS.tertiaryLabel,
    fontSize: 13,
    lineHeight: 17
  },
  activeRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
    backgroundColor: IOS.green
  },
  activeText: {
    color: IOS.greenDark,
    fontSize: 12,
    fontWeight: '600'
  },
  successInfo: {
    marginTop: 14,
    padding: 13,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: IOS.greenSoft
  },
  successInfoText: {
    flex: 1,
    marginLeft: 8,
    color: IOS.greenDark,
    fontSize: 12,
    lineHeight: 17
  },
  // NOT FOUND
  notFoundCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    backgroundColor: IOS.white,
    ...cardShadow
  },
  noMatchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: IOS.redSoft
  },
  noMatchText: {
    marginLeft: 4,
    color: IOS.red,
    fontSize: 11,
    fontWeight: '600'
  },
  notFoundIcon: {
    width: 60,
    height: 60,
    marginTop: 18,
    borderRadius: 30,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.redSoft
  },
  notFoundTitle: {
    marginTop: 12,
    textAlign: 'center',
    color: IOS.label,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  notFoundDescription: {
    marginTop: 8,
    paddingHorizontal: 5,
    textAlign: 'center',
    color: IOS.tertiaryLabel,
    fontSize: 13,
    lineHeight: 19
  },
  recommendations: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: IOS.surface
  },
  recommendTitle: {
    color: IOS.tertiaryLabel,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6
  },
  recommendItem: {
    marginTop: 7,
    color: IOS.secondaryLabel,
    fontSize: 12,
    lineHeight: 17
  },
  // PRIMARY BUTTON
  primaryButton: {
    height: 54,
    marginTop: 18,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blue,
    shadowColor: IOS.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4
  },
  primaryButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  // HELP
  helpRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  helpText: {
    color: IOS.tertiaryLabel,
    fontSize: 12
  },
  helpLink: {
    marginLeft: 5,
    color: IOS.blue,
    fontSize: 12,
    fontWeight: '600'
  },
  // CHATBOT BUTTON
  chatbot: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blue,
    shadowColor: IOS.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  }
});
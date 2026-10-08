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

  ScrollView,

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

export default function LinkPatientScreen({

  navigation

}) {

  // ====================================================

  // FORM VALUES

  // ====================================================

  const [

    name,

    setName

  ] = useState('');

  const [

    patientIdentifier,

    setPatientIdentifier

  ] = useState('');

  const [

    phone,

    setPhone

  ] = useState('');

  // ====================================================

  // UI STATE

  // ====================================================

  const [

    focusedInput,

    setFocusedInput

  ] = useState(null);

  const [

    suggestions,

    setSuggestions

  ] = useState([]);

  const [

    suggestionsLoading,

    setSuggestionsLoading

  ] = useState(false);

  const [

    selectedSuggestion,

    setSelectedSuggestion

  ] = useState(null);

  const [

    searching,

    setSearching

  ] = useState(false);

  const [

    linking,

    setLinking

  ] = useState(false);

  const [

    searchStatus,

    setSearchStatus

  ] = useState('idle');

  const [

    matchedPatient,

    setMatchedPatient

  ] = useState(null);

  // PATIENT CONSENT / OTP UI STATE

  const [otpSession, setOtpSession] = useState(null);

  const [linkError, setLinkError] = useState('');

  const suggestionTimer =

    useRef(null);

  // ====================================================

  // CLEAN UP TIMER

  // ====================================================

  useEffect(() => {

    return () => {

      if (

        suggestionTimer.current

      ) {

        clearTimeout(

          suggestionTimer.current

        );

      }

    };

  }, []);

  // ====================================================

  // RESET VERIFIED / NOT FOUND RESULT

  // ====================================================

  const resetSearchResult = () => {

    setSearchStatus(

      'idle'

    );

    setMatchedPatient(

      null

    );

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

    if (

      suggestionTimer.current

    ) {

      clearTimeout(

        suggestionTimer.current

      );

      suggestionTimer.current =

        null;

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

  const loadSuggestions =

    async (value) => {

      const cleanName =

        value.trim();

      if (

        cleanName.length < 2

      ) {

        setSuggestions([]);

        return;

      }

      try {

        setSuggestionsLoading(

          true

        );

        const response =

          await getPatientSuggestions(

            cleanName

          );

        setSuggestions(

          response?.data || []

        );

      } catch (error) {

        console.log(

          'Patient suggestions error:',

          error?.response?.data ||

          error.message

        );

        setSuggestions([]);

      } finally {

        setSuggestionsLoading(

          false

        );

      }

    };

  // ====================================================

  // NAME CHANGE

  // ====================================================

  const handleNameChange =

    (value) => {

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

        setSelectedSuggestion(

          null

        );

        setPatientIdentifier(

          ''

        );

      }

      if (

        suggestionTimer.current

      ) {

        clearTimeout(

          suggestionTimer.current

        );

      }

      if (

        value.trim().length < 2

      ) {

        setSuggestions([]);

        return;

      }

      /*

        Debounce so we don't call the API

        after every individual key immediately.

      */

      suggestionTimer.current =

        setTimeout(

          () => {

            loadSuggestions(

              value

            );

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

  const handleSelectSuggestion =

    (patient) => {

      setSelectedSuggestion(

        patient

      );

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

        setPatientIdentifier(

          patient.nic

        );

      } else if (

        patient.patientId

      ) {

        setPatientIdentifier(

          patient.patientId

        );

      }

      setSuggestions([]);

      setSuggestionsLoading(false);

      setSearchStatus('idle');

      setMatchedPatient(null);

    };

  // ====================================================

  // IDENTIFIER CHANGE

  // ====================================================

  const handleIdentifierChange =

    (value) => {

      setPatientIdentifier(

        value

      );

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

  const handleSearch =

    async () => {

      const cleanName =

        name.trim();

      const cleanIdentifier =

        patientIdentifier.trim();

      const cleanPhone =

        phone.trim();

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

        setSearching(

          true

        );

        setSuggestions([]);

        setMatchedPatient(

          null

        );

        const response =

          await searchPatient({

            name:

              cleanName,

            patientIdentifier:

              cleanIdentifier,

            phone:

              cleanPhone

          });

        if (

          response?.success &&

          response?.data

        ) {

          const patient =

            response.data;

          setMatchedPatient(

            patient

          );

          setSelectedSuggestion(

            patient

          );

          setName(

            `${patient.firstName || ''} ${patient.lastName || ''}`

              .trim()

          );

          if (patient.nic) {

            setPatientIdentifier(

              patient.nic

            );

          } else if (

            patient.patientId

          ) {

            setPatientIdentifier(

              patient.patientId

            );

          }

          setSearchStatus(

            'found'

          );

          return;

        }

        setSearchStatus(

          'notFound'

        );

      } catch (error) {

        console.log(

          'Patient search error:',

          error?.response?.data ||

          error.message

        );

        if (

          error?.response?.status ===

          404

        ) {

          setSearchStatus(

            'notFound'

          );

          setMatchedPatient(

            null

          );

        } else if (

          error?.response?.status ===

          409

        ) {

          setSearchStatus(

            'idle'

          );

          Alert.alert(

            'More Details Required',

            error?.response?.data?.message ||

            'More than one patient matched. Please select the correct patient or enter additional details.'

          );

        } else {

          setSearchStatus(

            'idle'

          );

          Alert.alert(

            'Search Failed',

            error?.response?.data?.message ||

            'Unable to search for the patient.'

          );

        }

      } finally {

        setSearching(

          false

        );

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

    setSearchStatus(

      'idle'

    );

    setMatchedPatient(

      null

    );

  };

  // ====================================================

  // INPUT BORDER HELPER

  // ====================================================

  const getInputStyle =

    inputName => [

      styles.inputContainer,

      focusedInput ===

        inputName &&

        styles.inputContainerFocused

    ];

  return (

    <View style={styles.outer}>

      <View style={styles.screen}>

        {/* =========================================== */}

        {/* HEADER */}

        {/* =========================================== */}

        <CaregiverHeader

          title="Add / Link Patient"

          navigation={

            navigation

          }

          showBack

          onBack={() =>

            navigation.navigate(

              'CaregiverHome'

            )

          }

        />

        <ScrollView

          style={

            styles.scroll

          }

          contentContainerStyle={

            styles.content

          }

          showsVerticalScrollIndicator={

            false

          }

          keyboardShouldPersistTaps="handled"

        >

          {/* =========================================== */}

          {/* PAGE INTRO */}

          {/* =========================================== */}

          <Text style={styles.title}>

            Link Patient Record

          </Text>

          <Text style={styles.description}>

            Enter the patient's name, Patient ID or NIC, and registered phone number to securely search the hospital records.

          </Text>

          {/* =========================================== */}

          {/* PATIENT NAME */}

          {/* =========================================== */}

          <Text style={styles.inputLabel}>

            PATIENT NAME

          </Text>

          <View

            style={

              getInputStyle(

                'name'

              )

            }

          >

            <Ionicons

              name="person-outline"

              size={18}

              color={

                focusedInput ===

                'name'

                  ? '#155EEF'

                  : '#64748B'

              }

            />

            <TextInput

              value={

                name

              }

              onChangeText={

                handleNameChange

              }

              onFocus={() =>

                setFocusedInput(

                  'name'

                )

              }

              onBlur={() =>

                setFocusedInput(

                  null

                )

              }

              placeholder="Name"

              placeholderTextColor="#94A3B8"

              autoCapitalize="words"

              selectionColor="#7AA7FF"

              cursorColor="#155EEF"

              style={[

                styles.input,

                {

                  caretColor:

                    '#155EEF'

                }

              ]}

            />

            {suggestionsLoading ? (

              <ActivityIndicator

                size="small"

                color="#155EEF"

              />

            ) : name.length > 0 ? (

              <TouchableOpacity

                onPress={

                  clearAllFields

                }

                activeOpacity={

                  0.7

                }

                style={

                  styles.clearButton

                }

              >

                <Ionicons

                  name="close-circle"

                  size={18}

                  color="#94A3B8"

                />

              </TouchableOpacity>

            ) : null}

          </View>

          {/* =========================================== */}

          {/* MATCHING NAME RESULTS */}

          {/* =========================================== */}

          {suggestions.length > 0 && (

            <View

              style={

                styles.suggestionsCard

              }

            >

              <Text

                style={

                  styles.suggestionsTitle

                }

              >

                MATCHING PATIENTS

              </Text>

              {suggestions.map(

                (

                  patient,

                  index

                ) => (

                  <TouchableOpacity

                    key={

                      patient.patientId

                    }

                    activeOpacity={

                      0.7

                    }

                    onPress={() =>

                      handleSelectSuggestion(

                        patient

                      )

                    }

                    style={[

                      styles.suggestionRow,

                      index !==

                        suggestions.length -

                          1 &&

                        styles.suggestionDivider

                    ]}

                  >

                    <View

                      style={

                        styles.suggestionAvatar

                      }

                    >

                      <Text

                        style={

                          styles.suggestionAvatarText

                        }

                      >

                        {patient

                          .firstName?.[0]}

                        {patient

                          .lastName?.[0]}

                      </Text>

                    </View>

                    <View

                      style={

                        styles.suggestionContent

                      }

                    >

                      <Text

                        style={

                          styles.suggestionName

                        }

                      >

                        {patient.firstName}{' '}

                        {patient.lastName}

                      </Text>

                      <Text

                        style={

                          styles.suggestionPatientId

                        }

                      >

                        Patient ID:{' '}

                        {patient.patientId}

                      </Text>

                    </View>

                    <Ionicons

                      name="chevron-forward"

                      size={18}

                      color="#94A3B8"

                    />

                  </TouchableOpacity>

                )

              )}

            </View>

          )}

          {/* =========================================== */}

          {/* PATIENT ID / NIC */}

          {/* =========================================== */}

          <Text style={styles.inputLabel}>

            PATIENT ID / NIC

          </Text>

          <View

            style={

              getInputStyle(

                'identifier'

              )

            }

          >

            <Ionicons

              name="card-outline"

              size={18}

              color={

                focusedInput ===

                'identifier'

                  ? '#155EEF'

                  : '#64748B'

              }

            />

            <TextInput

              value={

                patientIdentifier

              }

              onChangeText={

                handleIdentifierChange

              }

              onFocus={() =>

                setFocusedInput(

                  'identifier'

                )

              }

              onBlur={() =>

                setFocusedInput(

                  null

                )

              }

              placeholder="Patient ID or NIC"

              placeholderTextColor="#94A3B8"

              autoCapitalize="characters"

              selectionColor="#7AA7FF"

              cursorColor="#155EEF"

              style={[

                styles.input,

                {

                  caretColor:

                    '#155EEF'

                }

              ]}

            />

            {patientIdentifier.length >

              0 && (

              <TouchableOpacity

                onPress={() => {

                  setPatientIdentifier(

                    ''

                  );

                  resetSearchResult();

                }}

                activeOpacity={

                  0.7

                }

                style={

                  styles.clearButton

                }

              >

                <Ionicons

                  name="close-circle"

                  size={18}

                  color="#94A3B8"

                />

              </TouchableOpacity>

            )}

          </View>

          {/* =========================================== */}

          {/* PHONE */}

          {/* =========================================== */}

          <Text style={styles.inputLabel}>

            PATIENT PHONE NUMBER

          </Text>

          <View

            style={

              getInputStyle(

                'phone'

              )

            }

          >

            <Ionicons

              name="call-outline"

              size={18}

              color={

                focusedInput ===

                'phone'

                  ? '#155EEF'

                  : '#64748B'

              }

            />

            <TextInput

              value={

                phone

              }

              onChangeText={

                handlePhoneChange

              }

              onFocus={() =>

                setFocusedInput(

                  'phone'

                )

              }

              onBlur={() =>

                setFocusedInput(

                  null

                )

              }

              placeholder="e.g. 0771234567"

              placeholderTextColor="#94A3B8"

              keyboardType="phone-pad"

              selectionColor="#7AA7FF"

              cursorColor="#155EEF"

              style={[

                styles.input,

                {

                  caretColor:

                    '#155EEF'

                }

              ]}

            />

          </View>

          {/* =========================================== */}

          {/* SEARCH BUTTON */}

          {/* =========================================== */}

          <TouchableOpacity

            activeOpacity={

              0.8

            }

            disabled={

              searching

            }

            style={

              styles.searchButton

            }

            onPress={

              handleSearch

            }

          >

            {searching ? (

              <ActivityIndicator

                size="small"

                color="#155EEF"

              />

            ) : (

              <>

                <Ionicons

                  name="search-outline"

                  size={18}

                  color="#334155"

                />

                <Text

                  style={

                    styles.searchText

                  }

                >

                  SEARCH PATIENT

                </Text>

              </>

            )}

          </TouchableOpacity>

          {/* =========================================== */}

          {/* MATCH FOUND */}

          {/* =========================================== */}

          {searchStatus ===

            'found' &&

            matchedPatient && (

            <View

              style={

                styles.matchCard

              }

            >

              <View

                style={

                  styles.recordHeader

                }

              >

                <View

                  style={

                    styles.recordHeaderLeft

                  }

                >

                  <View

                    style={

                      styles.blueDot

                    }

                  />

                  <Text

                    style={

                      styles.recordLabel

                    }

                  >

                    VERIFIED RECORD

                  </Text>

                </View>

                <View

                  style={

                    styles.matchedBadge

                  }

                >

                  <Ionicons

                    name="checkmark-circle"

                    size={13}

                    color="#155EEF"

                  />

                  <Text

                    style={

                      styles.matchedText

                    }

                  >

                    Matched

                  </Text>

                </View>

              </View>

              <View

                style={

                  styles.patientRow

                }

              >

                <View

                  style={

                    styles.avatar

                  }

                >

                  <Text

                    style={

                      styles.avatarText

                    }

                  >

                    {matchedPatient

                      .firstName?.[0]}

                    {matchedPatient

                      .lastName?.[0]}

                  </Text>

                </View>

                <View

                  style={

                    styles.patientDetails

                  }

                >

                  <Text

                    style={

                      styles.patientName

                    }

                  >

                    {matchedPatient.firstName}{' '}

                    {matchedPatient.lastName}

                  </Text>

                  <Text

                    style={

                      styles.patientDetailText

                    }

                  >

                    Patient ID:{' '}

                    {matchedPatient.patientId}

                  </Text>

                  {matchedPatient.nic ? (

                    <Text

                      style={

                        styles.patientDetailText

                      }

                    >

                      NIC:{' '}

                      {matchedPatient.nic}

                    </Text>

                  ) : null}

                  <View

                    style={

                      styles.activeRow

                    }

                  >

                    <View

                      style={

                        styles.greenDot

                      }

                    />

                    <Text

                      style={

                        styles.activeText

                      }

                    >

                      Active patient record

                    </Text>

                  </View>

                </View>

              </View>

              <View

                style={

                  styles.successInfo

                }

              >

                <Ionicons

                  name="shield-checkmark-outline"

                  size={17}

                  color="#15803D"

                />

                <Text

                  style={

                    styles.successInfoText

                  }

                >

                  Patient details were verified against the hospital record.

                </Text>

              </View>

            </View>

          )}

          {/* =========================================== */}

          {/* NOT FOUND */}

          {/* =========================================== */}

          {searchStatus ===

            'notFound' && (

            <View

              style={

                styles.notFoundCard

              }

            >

              <View

                style={

                  styles.recordHeader

                }

              >

                <View

                  style={

                    styles.recordHeaderLeft

                  }

                >

                  <View

                    style={

                      styles.redDot

                    }

                  />

                  <Text

                    style={

                      styles.recordLabel

                    }

                  >

                    RECORD STATUS

                  </Text>

                </View>

                <View

                  style={

                    styles.noMatchBadge

                  }

                >

                  <Ionicons

                    name="warning-outline"

                    size={13}

                    color="#DC2626"

                  />

                  <Text

                    style={

                      styles.noMatchText

                    }

                  >

                    No Match Found

                  </Text>

                </View>

              </View>

              <View

                style={

                  styles.notFoundIcon

                }

              >

                <Ionicons

                  name="person-remove-outline"

                  size={27}

                  color="#EF4444"

                />

              </View>

              <Text

                style={

                  styles.notFoundTitle

                }

              >

                No Patient Record Found

              </Text>

              <Text

                style={

                  styles.notFoundDescription

                }

              >

                No active patient matches the details entered. Please check the patient's name, Patient ID/NIC, and registered phone number.

              </Text>

              <View

                style={

                  styles.recommendations

                }

              >

                <Text

                  style={

                    styles.recommendTitle

                  }

                >

                  RECOMMENDED ACTIONS:

                </Text>

                <Text

                  style={

                    styles.recommendItem

                  }

                >

                  • Verify the patient's name for typing errors

                </Text>

                <Text

                  style={

                    styles.recommendItem

                  }

                >

                  • Check the registered phone number

                </Text>

                <Text

                  style={

                    styles.recommendItem

                  }

                >

                  • Check the Patient ID or NIC

                </Text>

                <Text

                  style={

                    styles.recommendItem

                  }

                >

                  • Ensure the patient has completed hospital registration

                </Text>

              </View>

            </View>

          )}

          {/* =========================================== */}

          {/* LINK / SEARCH AGAIN */}

          {/* =========================================== */}

          {!!linkError && (

            <View style={styles.linkErrorBox} accessibilityRole="alert">

              <Ionicons name="alert-circle-outline" size={17} color="#DC2626" />

              <Text style={styles.linkErrorText}>{linkError}</Text>

            </View>

          )}

          {searchStatus ===

            'found' ? (

            <TouchableOpacity

              disabled={

                linking

              }

              activeOpacity={

                0.85

              }

              onPress={

                handleLink

              }

              style={

                styles.primaryButton

              }

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

                    size={18}

                    color="#FFFFFF"

                  />

                  <Text

                    style={

                      styles.primaryButtonText

                    }

                  >

                    LINK PATIENT

                  </Text>

                </>

              )}

            </TouchableOpacity>

          ) : searchStatus ===

            'notFound' ? (

            <TouchableOpacity

              activeOpacity={

                0.85

              }

              onPress={

                handleSearchAgain

              }

              style={

                styles.primaryButton

              }

            >

              <Ionicons

                name="refresh-outline"

                size={18}

                color="#FFFFFF"

              />

              <Text

                style={

                  styles.primaryButtonText

                }

              >

                SEARCH AGAIN

              </Text>

            </TouchableOpacity>

          ) : null}

          {/* =========================================== */}

          {/* HELP */}

          {/* =========================================== */}

          <View

            style={

              styles.helpRow

            }

          >

            <Text

              style={

                styles.helpText

              }

            >

              Need immediate help?

            </Text>

            <Text

              style={

                styles.helpLink

              }

            >

              Visit OPD Reception Desk

            </Text>

          </View>

        </ScrollView>

        {/* ============================================= */}

        {/* CHATBOT BUTTON */}

        {/* ============================================= */}

        <TouchableOpacity

          style={

            styles.chatbot

          }

          activeOpacity={

            0.8

          }

        >

          <MaterialCommunityIcons

            name="robot-outline"

            size={27}

            color="#0757D8"

          />

        </TouchableOpacity>

        {/* ============================================= */}

        {/* BOTTOM NAV */}

        {/* ============================================= */}

        <CaregiverBottomNav

          navigation={

            navigation

          }

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

const styles =

  StyleSheet.create({

    linkErrorBox: {

      marginTop: 14,

      padding: 11,

      borderRadius: 10,

      backgroundColor: '#FFF1F2',

      flexDirection: 'row',

      alignItems: 'flex-start',

      borderWidth: 1,

      borderColor: '#FECDD3'

    },

    linkErrorText: {

      flex: 1,

      marginLeft: 8,

      color: '#B91C1C',

      fontSize: 12,

      lineHeight: 18

    },

    outer: {

      flex: 1,

      backgroundColor:

        '#EDF1F5'

    },

    screen: {

      flex: 1,

      width:

        '100%',

      maxWidth:

        430,

      alignSelf:

        'center',

      position:

        'relative',

      backgroundColor:

        '#F9F7FF'

    },

    scroll: {

      flex: 1

    },

    content: {

      paddingHorizontal:

        20,

      paddingTop:

        24,

      paddingBottom:

        95

    },

    // ==================================================

    // PAGE INTRO

    // ==================================================

    title: {

      color:

        '#111827',

      fontSize:

        18,

      lineHeight:

        23,

      fontWeight:

        '800'

    },

    description: {

      marginTop:

        7,

      marginBottom:

        22,

      color:

        '#64748B',

      fontSize:

        12,

      lineHeight:

        18

    },

    // ==================================================

    // FORM LABELS

    // ==================================================

    inputLabel: {

      marginBottom:

        8,

      color:

        '#475569',

      fontSize:

        11,

      lineHeight:

        15,

      fontWeight:

        '800'

    },

    // ==================================================

    // INPUT

    // ==================================================

    inputContainer: {

      minHeight:

        53,

      marginBottom:

        18,

      paddingHorizontal:

        14,

      flexDirection:

        'row',

      alignItems:

        'center',

      borderWidth:

        1,

      borderColor:

        '#CBD5E1',

      borderRadius:

        11,

      backgroundColor:

        '#FFFFFF'

    },

    inputContainerFocused: {

      borderWidth:

        2,

      borderColor:

        '#155EEF',

      shadowColor:

        '#155EEF',

      shadowOpacity:

        0.08,

      shadowRadius:

        3,

      shadowOffset: {

        width:

          0,

        height:

          0

      }

    },

    input: {

      flex: 1,

      minHeight:

        50,

      marginLeft:

        10,

      color:

        '#1E293B',

      fontSize:

        14,

      lineHeight:

        19,

      fontWeight:

        '500',

      outlineStyle:

        'none'

    },

    clearButton: {

      width:

        28,

      height:

        38,

      alignItems:

        'center',

      justifyContent:

        'center'

    },

    // ==================================================

    // PATIENT SUGGESTIONS

    // ==================================================

    suggestionsCard: {

      marginTop:

        -8,

      marginBottom:

        18,

      overflow:

        'hidden',

      borderWidth:

        1,

      borderColor:

        '#CBD5E1',

      borderRadius:

        11,

      backgroundColor:

        '#FFFFFF'

    },

    suggestionsTitle: {

      paddingHorizontal:

        14,

      paddingVertical:

        10,

      color:

        '#64748B',

      fontSize:

        10,

      fontWeight:

        '800',

      backgroundColor:

        '#F8FAFC'

    },

    suggestionRow: {

      minHeight:

        64,

      paddingHorizontal:

        13,

      paddingVertical:

        10,

      flexDirection:

        'row',

      alignItems:

        'center',

      backgroundColor:

        '#FFFFFF'

    },

    suggestionDivider: {

      borderBottomWidth:

        1,

      borderBottomColor:

        '#EEF2F6'

    },

    suggestionAvatar: {

      width:

        42,

      height:

        42,

      borderRadius:

        11,

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#EAF1FF'

    },

    suggestionAvatarText: {

      color:

        '#155EEF',

      fontSize:

        13,

      fontWeight:

        '800'

    },

    suggestionContent: {

      flex:

        1,

      marginLeft:

        11

    },

    suggestionName: {

      color:

        '#111827',

      fontSize:

        13,

      fontWeight:

        '800'

    },

    suggestionPatientId: {

      marginTop:

        4,

      color:

        '#64748B',

      fontSize:

        10

    },

    // ==================================================

    // SEARCH BUTTON

    // ==================================================

    searchButton: {

      height:

        48,

      borderRadius:

        11,

      borderWidth:

        1,

      borderColor:

        '#BFCADA',

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#FFFFFF'

    },

    searchText: {

      marginLeft:

        7,

      color:

        '#334155',

      fontSize:

        12,

      fontWeight:

        '800',

      letterSpacing:

        0.2

    },

    // ==================================================

    // MATCH CARD

    // ==================================================

    matchCard: {

      marginTop:

        17,

      padding:

        15,

      borderRadius:

        13,

      borderWidth:

        1,

      borderColor:

        '#C7D5E6',

      backgroundColor:

        '#FFFFFF'

    },

    recordHeader: {

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'space-between'

    },

    recordHeaderLeft: {

      flexDirection:

        'row',

      alignItems:

        'center'

    },

    blueDot: {

      width:

        6,

      height:

        6,

      borderRadius:

        3,

      marginRight:

        6,

      backgroundColor:

        '#155EEF'

    },

    redDot: {

      width:

        6,

      height:

        6,

      borderRadius:

        3,

      marginRight:

        6,

      backgroundColor:

        '#EF4444'

    },

    recordLabel: {

      color:

        '#334155',

      fontSize:

        10,

      fontWeight:

        '800'

    },

    matchedBadge: {

      paddingHorizontal:

        9,

      paddingVertical:

        5,

      borderRadius:

        14,

      flexDirection:

        'row',

      alignItems:

        'center',

      backgroundColor:

        '#EAF1FF'

    },

    matchedText: {

      marginLeft:

        4,

      color:

        '#155EEF',

      fontSize:

        9,

      fontWeight:

        '700'

    },

    patientRow: {

      marginTop:

        16,

      flexDirection:

        'row',

      alignItems:

        'center'

    },

    avatar: {

      width:

        50,

      height:

        50,

      borderRadius:

        13,

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#EAF1FF'

    },

    avatarText: {

      color:

        '#155EEF',

      fontSize:

        15,

      fontWeight:

        '800'

    },

    patientDetails: {

      flex:

        1,

      marginLeft:

        12

    },

    patientName: {

      color:

        '#111827',

      fontSize:

        15,

      fontWeight:

        '800'

    },

    patientDetailText: {

      marginTop:

        4,

      color:

        '#64748B',

      fontSize:

        11,

      lineHeight:

        15

    },

    activeRow: {

      marginTop:

        6,

      flexDirection:

        'row',

      alignItems:

        'center'

    },

    greenDot: {

      width:

        6,

      height:

        6,

      borderRadius:

        3,

      marginRight:

        5,

      backgroundColor:

        '#16A34A'

    },

    activeText: {

      color:

        '#15803D',

      fontSize:

        10,

      fontWeight:

        '700'

    },

    successInfo: {

      marginTop:

        14,

      padding:

        11,

      borderRadius:

        9,

      flexDirection:

        'row',

      alignItems:

        'center',

      backgroundColor:

        '#F0FDF4'

    },

    successInfoText: {

      flex:

        1,

      marginLeft:

        7,

      color:

        '#166534',

      fontSize:

        10,

      lineHeight:

        15

    },

    // ==================================================

    // NOT FOUND

    // ==================================================

    notFoundCard: {

      marginTop:

        17,

      padding:

        15,

      borderRadius:

        13,

      borderWidth:

        1,

      borderColor:

        '#FDA4AF',

      backgroundColor:

        '#FFFFFF'

    },

    noMatchBadge: {

      paddingHorizontal:

        8,

      paddingVertical:

        5,

      flexDirection:

        'row',

      alignItems:

        'center',

      borderRadius:

        13,

      backgroundColor:

        '#FFF1F2'

    },

    noMatchText: {

      marginLeft:

        4,

      color:

        '#DC2626',

      fontSize:

        9,

      fontWeight:

        '700'

    },

    notFoundIcon: {

      width:

        52,

      height:

        52,

      marginTop:

        19,

      borderRadius:

        26,

      alignSelf:

        'center',

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#FFF1F2'

    },

    notFoundTitle: {

      marginTop:

        13,

      textAlign:

        'center',

      color:

        '#111827',

      fontSize:

        17,

      fontWeight:

        '800'

    },

    notFoundDescription: {

      marginTop:

        8,

      paddingHorizontal:

        5,

      textAlign:

        'center',

      color:

        '#64748B',

      fontSize:

        11,

      lineHeight:

        17

    },

    recommendations: {

      marginTop:

        16,

      padding:

        12,

      borderRadius:

        10,

      backgroundColor:

        '#F8FAFC'

    },

    recommendTitle: {

      color:

        '#64748B',

      fontSize:

        9,

      fontWeight:

        '800'

    },

    recommendItem: {

      marginTop:

        7,

      color:

        '#64748B',

      fontSize:

        10,

      lineHeight:

        15

    },

    // ==================================================

    // PRIMARY BUTTON

    // ==================================================

    primaryButton: {

      height:

        48,

      marginTop:

        17,

      borderRadius:

        10,

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#0757D8'

    },

    primaryButtonText: {

      marginLeft:

        7,

      color:

        '#FFFFFF',

      fontSize:

        12,

      fontWeight:

        '800'

    },

    // ==================================================

    // HELP

    // ==================================================

    helpRow: {

      marginTop:

        15,

      flexDirection:

        'row',

      justifyContent:

        'center'

    },

    helpText: {

      color:

        '#94A3B8',

      fontSize:

        10

    },

    helpLink: {

      marginLeft:

        5,

      color:

        '#155EEF',

      fontSize:

        10,

      fontWeight:

        '700'

    },

    // ==================================================

    // CHATBOT BUTTON

    // ==================================================

    chatbot: {

      position:

        'absolute',

      right:

        15,

      bottom:

        76,

      width:

        48,

      height:

        48,

      borderRadius:

        24,

      borderWidth:

        3,

      borderColor:

        '#FFFFFF',

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#E5F4FF',

      shadowColor:

        '#000000',

      shadowOpacity:

        0.12,

      shadowRadius:

        4,

      shadowOffset: {

        width:

          0,

        height:

          2

      },

      elevation:

        4

    }

  });

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext'; // නිවැරදි path එක
import logo from '../../assets/logo.png';

const AppHeader = ({
  userName = 'User',
  userEmail = '',
  navigation,
  onNotificationPress,
  onPrescriptionPress,
  onProfilePress,
  onLogout,
}) => {
  const { logout } = useContext(AuthContext); // Context එකෙන් logout function එක ලබා ගැනීම
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      navigation?.navigate('Alerts');
    }
  };

  const handleProfileClick = () => {
    setDropdownVisible(!dropdownVisible);
    if (onProfilePress) {
      onProfilePress();
    }
  };

  // Logout ක්‍රියාත්මක කරන ප්‍රධාන function එක
  const handleLogoutPress = async () => {
    setDropdownVisible(false);
    if (onLogout) {
      onLogout();
    } else if (logout) {
      try {
        await logout();
      } catch (error) {
        console.log('Logout error:', error);
      }
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Left Section - Logo and App Name */}
      <View style={styles.leftSection}>
        <View style={styles.logoContainer}>
          <Image
            source={logo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.brandContainer}>
          <Text style={styles.headerTitle}>
            MEDI<Text style={styles.titleHighlight}>QUEUE</Text>
          </Text>

          <Text style={styles.headerSubtitle}>
            SMART OPD CARE
          </Text>
        </View>
      </View>

      {/* Right Section - Notifications, Prescriptions and Profile */}
      <View style={styles.rightSection}>
        {/* Notifications - Opens Alerts Screen */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleNotificationPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open alerts"
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={24}
            color="#007AFF"
          />

          {/* Notification Indicator */}
          <View style={styles.notificationDot} />
        </TouchableOpacity>

        {/* Prescriptions */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPrescriptionPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open prescriptions"
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={23}
            color="#3A3A3C"
          />
        </TouchableOpacity>

        {/* User Profile Button */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleProfileClick}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Profile Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownContainer}>
              {/* User Info Header */}
              <View style={styles.dropdownHeader}>
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>
                    {userName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.dropdownUserInfo}>
                  <Text style={styles.dropdownUserName} numberOfLines={1}>
                    {userName}
                  </Text>
                  <Text style={styles.dropdownUserRole} numberOfLines={1}>
                    {userEmail || 'Patient Account'}
                  </Text>
                </View>
              </View>

              <View style={styles.dropdownDivider} />

              {/* View Profile Option */}
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setDropdownVisible(false);
                  navigation?.navigate('Profile');
                }}
              >
                <Feather name="user" size={18} color="#007AFF" />
                <Text style={styles.dropdownItemText}>My Profile</Text>
              </TouchableOpacity>

              {/* Logout Option */}
              <TouchableOpacity
                style={[styles.dropdownItem, styles.logoutItem]}
                onPress={handleLogoutPress}
              >
                <Feather name="log-out" size={18} color="#FF3B30" />
                <Text style={[styles.dropdownItemText, styles.logoutText]}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#0B1B3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
    zIndex: 1000,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderCurve: 'continuous', // iOS squircle (අනිත් platform වල ignore වෙනවා)
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logo: {
    width: 30,
    height: 30,
  },
  brandContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: -0.4,
  },
  titleHighlight: {
    color: '#007AFF',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.8,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(118, 118, 128, 0.12)', // iOS tertiary fill
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileButton: {
    marginLeft: 10,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
    paddingRight: 16,
  },
  dropdownContainer: {
    width: 236,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.18)',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1220',
    letterSpacing: -0.2,
  },
  dropdownUserRole: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginVertical: 4,
    marginHorizontal: 14,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 12,
    letterSpacing: -0.2,
  },
  logoutItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    marginTop: 2,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

export default AppHeader;
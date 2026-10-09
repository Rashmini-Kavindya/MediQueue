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
            size={27}
            color="#1E40AF"
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
            size={26}
            color="#334155"
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
                <Feather name="user" size={18} color="#2563EB" />
                <Text style={styles.dropdownItemText}>My Profile</Text>
              </TouchableOpacity>

              {/* Logout Option */}
              <TouchableOpacity
                style={[styles.dropdownItem, styles.logoutItem]}
                onPress={handleLogoutPress}
              >
                <Feather name="log-out" size={18} color="#DC2626" />
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
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 18 : 16,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF8',
    ...Platform.select({
      ios: {
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
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
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  logo: {
    width: 39,
    height: 39,
  },
  brandContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  titleHighlight: {
    color: '#2563EB',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
    marginTop: 3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 7,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  profileButton: {
    marginLeft: 10,
  },
  profileAvatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingRight: 18,
  },
  dropdownContainer: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownAvatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dropdownUserRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 12,
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 2,
  },
  logoutText: {
    color: '#DC2626',
  },
});

export default AppHeader;
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import caregiverUiLabels from '../../screens/caregiver/caregiverUiLabels';

// Caregiver Queue-only bottom nav. Leaves the team's shared component untouched.
const TABS = [
  {route:'CaregiverHome', icon:'home-outline', on:'home', label:'home'},
  {route:'CaregiverQueue', icon:'people-outline', on:'people', label:'queue'},
  {route:'CaregiverAlerts', icon:'notifications-outline', on:'notifications', label:'alerts'},
  {route:'CaregiverProfile', icon:'person-circle-outline', on:'person-circle', label:'profile'}
];
const BLUE = '#155EEF';
export default function CaregiverQueueBottomNav({navigation, activeRoute='CaregiverQueue'}) {
  const {i18n} = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const L = caregiverUiLabels[locale] || caregiverUiLabels.en;
  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const selected = tab.route === activeRoute;
        return (
          <TouchableOpacity key={tab.route}
            onPress={() => {if (!selected) navigation.navigate(tab.route);}}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            accessibilityLabel={L[tab.label]}
            style={[styles.tab,selected && styles.selected]}>
            <Ionicons name={selected ? tab.on : tab.icon} size={23} color={selected?BLUE:'#475569'}/>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label,selected && styles.activeLabel]}>{L[tab.label]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  bar:{backgroundColor:'#FFFFFF',borderTopWidth:1,borderTopColor:'#E5E7EB',height:69,flexDirection:'row'},
  tab:{flex:1,alignItems:'center',justifyContent:'center',paddingTop:4,paddingHorizontal:2},
  selected:{borderTopWidth:2,borderTopColor:BLUE},
  label:{marginTop:4,fontSize:10,color:'#475569',textAlign:'center'},
  activeLabel:{color:BLUE,fontWeight:'700'}
});

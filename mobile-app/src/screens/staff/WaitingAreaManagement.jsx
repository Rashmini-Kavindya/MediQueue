import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  listWaitingAreasAdmin, createWaitingAreaAdmin,
  updateWaitingAreaAdmin, deleteWaitingAreaAdmin
} from '../../services/adminManagementApi';

const BLUE = '#155EEF';
const TYPE_LABEL = { lobby: 'Lobby', canteen: 'Canteen', waiting_hall: 'Waiting Hall', other: 'Other' };
const BLANK = { name: '', type: 'lobby', location: '', nearbyLandmark: '', seating: '', status: 'active' };
const apiMessage = (e) => e?.response?.data?.message || e?.message || 'Something went wrong.';

export default function WaitingAreaManagement({ navigation }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...BLANK });

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await listWaitingAreasAdmin();
      setAreas(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = () => { setRefreshing(true); load(); };
  const openCreate = () => { setSelected(null); setForm({ ...BLANK }); setError(''); setModal('form'); };
  const openEdit = (area) => {
    setSelected(area);
    setForm({
      name: area.name || '', type: area.type || 'lobby',
      location: area.location || '', nearbyLandmark: area.nearbyLandmark || '',
      seating: String(area.seating ?? ''), status: area.status || 'active'
    });
    setError(''); setModal('form');
  };
  const openDelete = (area) => { setSelected(area); setError(''); setModal('delete'); };
  const close = () => { if (!busy) { setModal(''); setError(''); } };
  const patch = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const save = async () => {
    if (busy) return;
    const name = form.name.trim();
    const location = form.location.trim();
    const seats = Number(form.seating);
    if (!name || !location || form.seating.trim() === '' || !Number.isInteger(seats) || seats < 0 || seats > 10000) {
      setError('Enter a name, location and whole-number seating capacity (0–10000).');
      return;
    }
    const payload = {
      name, type: form.type, location,
      nearbyLandmark: form.nearbyLandmark.trim(),
      seating: seats, status: form.status
    };
    setBusy(true); setError('');
    try {
      if (selected) await updateWaitingAreaAdmin(selected.waitingAreaId, payload);
      else await createWaitingAreaAdmin(payload);
      setModal('');
      setNotice(selected ? 'Waiting area updated successfully.' : 'Waiting area added successfully.');
      await load();
    } catch (e) { setError(apiMessage(e)); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      await deleteWaitingAreaAdmin(selected.waitingAreaId);
      setModal(''); setSelected(null);
      setNotice('Waiting area permanently deleted.');
      await load();
    } catch (e) { setError(apiMessage(e)); }
    finally { setBusy(false); }
  };

  const filtered = areas.filter(area => {
    const q = search.trim().toLowerCase();
    const matchText = !q || [area.name, area.location, area.nearbyLandmark, area.waitingAreaId]
      .some(value => String(value || '').toLowerCase().includes(q));
    return matchText && (typeFilter === 'all' || area.type === typeFilter) &&
      (statusFilter === 'all' || area.status === statusFilter);
  });

  const chip = (label, value, selectedValue, onPress) => (
    <TouchableOpacity key={value} onPress={() => onPress(value)} accessibilityRole="button"
      style={[styles.chip, selectedValue === value && styles.chipActive]}>
      <Text style={[styles.chipText, selectedValue === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
  const input = (label, value, onChangeText, extra = {}) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={label}
        placeholderTextColor="#94A3B8" style={styles.input} {...extra} />
    </View>
  );

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <View style={styles.topbar}>
          <TouchableOpacity accessibilityLabel="Open menu" onPress={() => navigation.openDrawer()} style={styles.topIcon}>
            <Ionicons name="menu" size={23} color={BLUE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.headerTitle}>Waiting Areas</Text><Text style={styles.headerSub}>Hospital management</Text></View>
          <TouchableOpacity accessibilityLabel="Refresh" onPress={refresh} style={styles.topIcon}>
            <Ionicons name="refresh" size={20} color={BLUE} />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.headingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Waiting Area Management</Text>
              <Text style={styles.hint}>Manage locations and seating capacity</Text>
            </View>
            <TouchableOpacity onPress={openCreate} style={styles.primarySmall}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.primarySmallText}>Add Area</Text>
            </TouchableOpacity>
          </View>
          {!!notice && <TouchableOpacity onPress={() => setNotice('')} style={styles.notice}>
            <Text style={styles.noticeText}>{notice}  ×</Text></TouchableOpacity>}
          {!!error && !modal && <Text style={styles.error}>{error}</Text>}
          <TextInput value={search} onChangeText={setSearch} style={styles.search}
            placeholder="Search name, location or landmark..." placeholderTextColor="#94A3B8" />
          <Text style={styles.filterLabel}>Type</Text>
          <View style={styles.chipRow}>{[
            ['All', 'all'], ['Lobby', 'lobby'], ['Canteen', 'canteen'],
            ['Waiting Hall', 'waiting_hall'], ['Other', 'other']
          ].map(([label, value]) => chip(label, value, typeFilter, setTypeFilter))}</View>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chipRow}>{[['All','all'], ['Active','active'], ['Inactive','inactive']]
            .map(([label,value]) => chip(label,value,statusFilter,setStatusFilter))}</View>
          <Text style={styles.resultText}>{filtered.length} waiting area{filtered.length !== 1 ? 's' : ''}</Text>
          {loading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 38 }}/> :
            filtered.length === 0 ? <View style={styles.empty}><Ionicons name="business-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>No waiting areas found.</Text></View> :
              filtered.map(area => <View key={area.waitingAreaId || area._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.areaIcon}><Ionicons name="business-outline" size={19} color={BLUE}/></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.areaName}>{area.name}</Text>
                    <Text style={styles.areaId}>{area.waitingAreaId}</Text>
                  </View>
                  <View style={[styles.badge, area.status === 'active' ? styles.goodBadge : styles.offBadge]}>
                    <Text style={[styles.badgeText, { color: area.status === 'active' ? '#15803D' : '#64748B' }]}>
                      {area.status === 'active' ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detail}>Type: {TYPE_LABEL[area.type] || area.type}</Text>
                <Text style={styles.detail}>Location: {area.location}</Text>
                <Text style={styles.detail}>Seating capacity: {area.seating ?? 0} seats</Text>
                {!!area.nearbyLandmark && <Text style={styles.detail}>Nearby: {area.nearbyLandmark}</Text>}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEdit(area)}>
                    <Ionicons name="create-outline" size={15} color={BLUE}/><Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => openDelete(area)}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626"/><Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>)
          }
        </ScrollView>
        <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
          <View style={styles.scrim}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{modal === 'delete' ? 'Delete Waiting Area?' : selected ? 'Edit Waiting Area' : 'Add Waiting Area'}</Text>
                <TouchableOpacity disabled={busy} onPress={close} accessibilityLabel="Close">
                  <Ionicons name="close-circle-outline" color="#64748B" size={25}/>
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {modal === 'form' ? <>
                  {input('Area name',form.name,v=>patch('name',v))}
                  <Text style={styles.fieldLabel}>Area type</Text>
                  <View style={styles.chipRow}>{Object.entries(TYPE_LABEL).map(([value,label]) => chip(label,value,form.type,v=>patch('type',v)))}</View>
                  {input('Location (building / floor)',form.location,v=>patch('location',v))}
                  {input('Nearby landmark (optional)',form.nearbyLandmark,v=>patch('nearbyLandmark',v),{placeholder:'e.g. Near the pharmacy'})}
                  {input('Seating capacity',form.seating,v=>patch('seating',v),{keyboardType:'number-pad'})}
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.chipRow}>{[['Active','active'],['Inactive','inactive']].map(([label,value])=>chip(label,value,form.status,v=>patch('status',v)))}</View>
                </> : <>
                  <View style={styles.warningIcon}><Ionicons name="warning-outline" size={28} color="#DC2626"/></View>
                  <Text style={styles.deleteConfirm}>Permanently delete “{selected?.name}”?</Text>
                  <Text style={styles.deleteExplanation}>This waiting-area record will be removed from MongoDB. This cannot be undone. Patient accounts, tokens, and other waiting areas are not deleted.</Text>
                </>}
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity disabled={busy} onPress={modal === 'delete' ? confirmDelete : save}
                  style={[styles.confirmButton, modal === 'delete' && styles.dangerButton, busy && {opacity:0.6}]}>
                  {busy ? <ActivityIndicator color="#FFFFFF"/> : <Text style={styles.confirmText}>
                    {modal === 'delete' ? 'Delete Permanently' : selected ? 'Save Changes' : 'Add Waiting Area'}
                  </Text>}
                </TouchableOpacity>
                <TouchableOpacity disabled={busy} onPress={close} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer:{flex:1,backgroundColor:'#EDF1F5'},screen:{flex:1,maxWidth:760,width:'100%',alignSelf:'center',backgroundColor:'#F8F7FC'},
  topbar:{backgroundColor:'#FFFFFF',borderBottomWidth:1,borderColor:'#E5E7EB',padding:14,flexDirection:'row',alignItems:'center',gap:12},
  topIcon:{width:36,height:36,alignItems:'center',justifyContent:'center',backgroundColor:'#EEF4FF',borderRadius:10},
  headerTitle:{fontSize:17,fontWeight:'800',color:'#111827'},headerSub:{fontSize:10,color:'#94A3B8'},
  content:{padding:16,paddingBottom:45},headingRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:17},
  pageTitle:{fontSize:16,fontWeight:'800',color:'#111827'},hint:{fontSize:10,color:'#64748B',marginTop:4},
  primarySmall:{backgroundColor:BLUE,borderRadius:10,paddingHorizontal:11,minHeight:38,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5},
  primarySmallText:{color:'#FFFFFF',fontWeight:'800',fontSize:11},
  search:{height:44,borderWidth:1,borderColor:'#D9E1EC',borderRadius:11,paddingHorizontal:13,backgroundColor:'#FFFFFF',fontSize:12,color:'#111827'},
  filterLabel:{fontSize:10,fontWeight:'700',color:'#64748B',marginTop:14,marginBottom:7},
  chipRow:{flexDirection:'row',gap:7,flexWrap:'wrap',marginBottom:4},chip:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:20,paddingHorizontal:10,paddingVertical:7,backgroundColor:'#FFFFFF'},
  chipActive:{backgroundColor:'#EAF1FF',borderColor:BLUE},chipText:{fontSize:10,color:'#64748B',fontWeight:'600'},chipTextActive:{color:BLUE,fontWeight:'800'},
  resultText:{marginVertical:13,color:'#64748B',fontSize:11,fontWeight:'700'},
  empty:{marginTop:28,alignItems:'center',padding:25,backgroundColor:'#FFFFFF',borderRadius:15},emptyText:{fontSize:12,color:'#64748B',marginTop:8},
  card:{backgroundColor:'#FFFFFF',borderColor:'#E0E5EC',borderWidth:1,borderRadius:15,padding:15,marginBottom:13},
  cardTop:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:12},areaIcon:{height:36,width:36,borderRadius:11,backgroundColor:'#EAF1FF',alignItems:'center',justifyContent:'center'},
  areaName:{fontSize:14,fontWeight:'800',color:'#111827'},areaId:{fontSize:9,color:'#94A3B8',marginTop:3},
  badge:{borderRadius:16,paddingHorizontal:9,paddingVertical:5},goodBadge:{backgroundColor:'#ECFDF3'},offBadge:{backgroundColor:'#F1F5F9'},badgeText:{fontSize:10,fontWeight:'700'},
  detail:{fontSize:11,color:'#475569',marginVertical:3},actionRow:{flexDirection:'row',gap:10,marginTop:13,borderTopWidth:1,borderTopColor:'#F1F5F9',paddingTop:12},
  editButton:{flex:1,backgroundColor:'#EEF4FF',borderRadius:9,justifyContent:'center',alignItems:'center',flexDirection:'row',padding:10,gap:6},
  editText:{color:BLUE,fontSize:11,fontWeight:'800'},deleteButton:{flex:1,borderWidth:1,borderColor:'#FECACA',borderRadius:9,justifyContent:'center',alignItems:'center',flexDirection:'row',padding:10,gap:6},
  deleteText:{color:'#DC2626',fontSize:11,fontWeight:'800'},
  notice:{backgroundColor:'#ECFDF3',padding:12,borderRadius:10,marginBottom:13},noticeText:{color:'#166534',fontSize:11},
  error:{color:'#B91C1C',backgroundColor:'#FEF2F2',borderRadius:8,padding:10,marginVertical:10,fontSize:11},
  scrim:{flex:1,backgroundColor:'rgba(15,23,42,0.56)',justifyContent:'center',padding:16,alignItems:'center'},
  modalBox:{width:'100%',maxWidth:450,maxHeight:'90%',padding:18,backgroundColor:'#FFFFFF',borderRadius:20},
  modalHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},modalTitle:{fontSize:17,fontWeight:'800',color:'#111827',flex:1},
  field:{marginBottom:13},fieldLabel:{fontSize:11,fontWeight:'700',color:'#334155',marginBottom:7},
  input:{height:43,borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,paddingHorizontal:12,color:'#111827',fontSize:12},
  warningIcon:{alignSelf:'center',height:58,width:58,backgroundColor:'#FEF2F2',borderRadius:29,alignItems:'center',justifyContent:'center',marginVertical:12},
  deleteConfirm:{fontSize:15,fontWeight:'800',color:'#111827',textAlign:'center'},
  deleteExplanation:{fontSize:12,color:'#64748B',textAlign:'center',lineHeight:19,marginVertical:15},
  confirmButton:{backgroundColor:BLUE,minHeight:44,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:12},
  dangerButton:{backgroundColor:'#DC2626'},confirmText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},
  cancelButton:{minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,marginTop:10},
  cancelText:{fontSize:12,fontWeight:'700',color:'#334155'}
});

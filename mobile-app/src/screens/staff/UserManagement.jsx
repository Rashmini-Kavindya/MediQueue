import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  listUsersAdmin, getUserAdmin, addStaffAdmin, updateUserAdmin,
  deactivateUserAdmin, permanentlyDeleteStaffAdmin
} from '../../services/adminManagementApi';

const BLUE = '#155EEF';
const EMPTY = { firstName:'',lastName:'',email:'',phone:'',nic:'',password:'',language:'en' };
const messageOf = e => e?.response?.data?.message || e?.message || 'Something went wrong.';
const roleName = value => (value || 'Unknown').replace(/^./, x => x.toUpperCase());

function Chip({ label, active, onPress }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[s.chip, active && s.chipActive]}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </TouchableOpacity>;
}
function Field({ label, value, onChangeText, ...props }) {
  return <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TextInput value={String(value ?? '')} onChangeText={onChangeText} placeholder={label}
      placeholderTextColor="#94A3B8" style={s.input} {...props}/>
  </View>;
}

export default function UserManagement({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });

  const load = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const response = await listUsersAdmin(params);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (e) { setError(messageOf(e)); }
    finally { setLoading(false); }
  }, []);

  const reload = (nextSearch = search, nextRole = role, nextStatus = status) => load({
    ...(nextSearch.trim() && { search: nextSearch.trim() }),
    ...(nextRole !== 'all' && { role: nextRole }),
    ...(nextStatus !== 'all' && { status: nextStatus })
  });
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const changeRole = next => { setRole(next); reload(search, next, status); };
  const changeStatus = next => { setStatus(next); reload(search, role, next); };
  const resetFilters = () => { setSearch(''); setRole('all'); setStatus('all'); load(); };
  const setValue = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const openAdd = () => { setSelected(null); setForm({ ...EMPTY }); setError(''); setModal('add'); };
  const openEdit = user => {
    setSelected(user);
    setForm({
      firstName:user.firstName || '', lastName:user.lastName || '',
      email:user.email || '', phone:user.phone || '', nic:user.nic || '',
      password:'', language:user.language || 'en'
    });
    setError(''); setModal('edit');
  };
  const openView = async user => {
    setError('');
    try {
      const response = await getUserAdmin(user.userId);
      setSelected(response?.data || user);
    } catch (e) { setSelected(user); setError(messageOf(e)); }
    setModal('view');
  };
  const openConfirm = (kind, user) => { setSelected(user); setError(''); setModal(kind); };
  const close = () => { if (!busy) {setModal('');setError('');} };

  const save = async () => {
    if (busy) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('First name, last name, email, and phone are required.'); return;
    }
    if (modal === 'add' && form.password.length < 6) {
      setError('Staff password must have at least 6 characters.'); return;
    }
    const payload = {
      firstName:form.firstName.trim(), lastName:form.lastName.trim(),
      email:form.email.trim().toLowerCase(), phone:form.phone.trim(),
      nic:form.nic.trim(), language:form.language
    };
    if (modal === 'add') payload.password = form.password;
    setBusy(true); setError('');
    try {
      if (modal === 'add') await addStaffAdmin(payload);
      else await updateUserAdmin(selected.userId, payload);
      setNotice(modal === 'add' ? 'Staff user added successfully.' : 'User updated successfully.');
      setModal(''); await reload();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };

  const confirmStatus = async () => {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      if (modal === 'activate') await updateUserAdmin(selected.userId, { status:'active' });
      else await deactivateUserAdmin(selected.userId);
      setNotice(modal === 'activate' ? 'User reactivated. They can sign in again.' : 'User deactivated. Existing login tokens will be rejected.');
      setModal(''); await reload();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };
  const confirmPermanent = async () => {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      await permanentlyDeleteStaffAdmin(selected.userId);
      setNotice('Staff account permanently deleted.');
      setModal(''); await reload();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };

  const fullName = user => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const idFor = user => user?.patientId || user?.caregiverId || user?.staffId || user?.adminId || user?.userId;
  const formBody = <>
    <Field label="First name" value={form.firstName} onChangeText={v=>setValue('firstName',v)} autoCapitalize="words"/>
    <Field label="Last name" value={form.lastName} onChangeText={v=>setValue('lastName',v)} autoCapitalize="words"/>
    <Field label="Email" value={form.email} onChangeText={v=>setValue('email',v)} keyboardType="email-address" autoCapitalize="none"/>
    <Field label="Phone" value={form.phone} onChangeText={v=>setValue('phone',v)} keyboardType="phone-pad"/>
    <Field label="NIC (optional)" value={form.nic} onChangeText={v=>setValue('nic',v)} autoCapitalize="characters"/>
    {modal === 'add' && <Field label="Temporary password (min. 6 characters)" value={form.password} onChangeText={v=>setValue('password',v)} secureTextEntry/>}
    <Text style={s.fieldLabel}>Language</Text>
    <View style={s.chipRow}>
      {[['English','en'],['Sinhala','si'],['Tamil','ta']].map(([label,value]) =>
        <Chip key={value} label={label} active={form.language === value} onPress={()=>setValue('language',value)}/>) }
    </View>
    <Text style={s.finePrint}>Only staff can be created here. Patients and caregivers register through the normal verification flow.</Text>
  </>;

  return <View style={s.outer}><View style={s.screen}>
    <View style={s.topbar}>
      <TouchableOpacity accessibilityLabel="Open menu" onPress={()=>navigation.openDrawer()} style={s.topIcon}>
        <Ionicons name="menu" size={23} color={BLUE}/>
      </TouchableOpacity>
      <View style={{flex:1}}><Text style={s.headerTitle}>Users</Text><Text style={s.headerSub}>Admin management</Text></View>
      <TouchableOpacity accessibilityLabel="Refresh" onPress={()=>reload()} style={s.topIcon}><Ionicons name="refresh" size={20} color={BLUE}/></TouchableOpacity>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.headingRow}>
        <View style={{flex:1}}><Text style={s.pageTitle}>User Management</Text><Text style={s.hint}>Staff, caregivers and patients</Text></View>
        <TouchableOpacity onPress={openAdd} style={s.addButton}><Ionicons name="person-add-outline" size={15} color="#FFFFFF"/><Text style={s.addText}>Add Staff</Text></TouchableOpacity>
      </View>
      {!!notice && <TouchableOpacity style={s.notice} onPress={()=>setNotice('')}><Text style={s.noticeText}>{notice}  ×</Text></TouchableOpacity>}
      {!!error && !modal && <Text style={s.error}>{error}</Text>}
      <View style={s.searchRow}>
        <TextInput style={s.search} placeholder="Search name, ID, email, phone..." placeholderTextColor="#94A3B8"
          value={search} onChangeText={setSearch} onSubmitEditing={()=>reload()} returnKeyType="search" />
        <TouchableOpacity onPress={()=>reload()} style={s.searchButton} accessibilityLabel="Search users"><Ionicons name="search" size={19} color="#FFFFFF"/></TouchableOpacity>
      </View>
      <Text style={s.filterTitle}>Filter by role</Text>
      <View style={s.chipRow}>{[['All','all'],['Patients','patient'],['Caregivers','caregiver'],['Staff','staff'],['Admins','admin']].map(([label,value]) =>
        <Chip key={value} label={label} active={role===value} onPress={()=>changeRole(value)}/>)}</View>
      <Text style={s.filterTitle}>Filter by status</Text>
      <View style={s.chipRow}>{[['All','all'],['Active','active'],['Inactive','inactive'],['Pending','pending']].map(([label,value]) =>
        <Chip key={value} label={label} active={status===value} onPress={()=>changeStatus(value)}/>)}</View>
      <TouchableOpacity onPress={resetFilters} style={s.reset}><Text style={s.resetText}>Clear filters</Text></TouchableOpacity>
      <Text style={s.resultText}>{users.length} user{users.length !== 1?'s':''}</Text>
      {loading ? <ActivityIndicator size="large" color={BLUE} style={{marginTop:38}}/> : users.length === 0 ?
        <View style={s.empty}><Text style={s.hint}>No users match these filters.</Text></View> :
        users.map(user => <View key={user.userId} style={s.card}>
          <View style={s.cardHead}>
            <View style={s.avatar}><Text style={s.avatarText}>{(user.firstName?.[0] || 'U')+(user.lastName?.[0] || '')}</Text></View>
            <View style={{flex:1}}><Text style={s.name}>{fullName(user)}</Text>
              <Text style={s.subtitle}>{idFor(user)}</Text></View>
            <View style={[s.badge, user.status==='active'?s.active:user.status==='inactive'?s.inactive:s.pending]}>
              <Text style={[s.badgeText,{color:user.status==='active'?'#15803D':user.status==='inactive'?'#64748B':'#92400E'}]}>{roleName(user.status)}</Text>
            </View>
          </View>
          <Text style={s.detail}>Role: {roleName(user.role)}</Text>
          <Text style={s.detail}>Email: {user.email || '—'}</Text>
          <Text style={s.detail}>Phone: {user.phone || '—'}</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.action} onPress={()=>openView(user)}><Ionicons name="eye-outline" size={15} color={BLUE}/><Text style={s.actionLabel}>View</Text></TouchableOpacity>
            <TouchableOpacity style={s.action} onPress={()=>openEdit(user)}><Ionicons name="create-outline" size={15} color={BLUE}/><Text style={s.actionLabel}>Edit</Text></TouchableOpacity>
            {user.status === 'inactive' ?
              <TouchableOpacity style={s.action} onPress={()=>openConfirm('activate',user)}><Ionicons name="checkmark-circle-outline" size={15} color="#15803D"/><Text style={[s.actionLabel,{color:'#15803D'}]}>Activate</Text></TouchableOpacity> :
              <TouchableOpacity style={s.action} onPress={()=>openConfirm('deactivate',user)}><Ionicons name="ban-outline" size={15} color="#DC2626"/><Text style={[s.actionLabel,{color:'#DC2626'}]}>Deactivate</Text></TouchableOpacity>}
          </View>
          {user.role === 'staff' && <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete ${fullName(user)} permanently`}
            onPress={()=>openConfirm('permanent',user)}
            style={s.permanentLink}>
            <Ionicons name="trash-outline" size={14} color="#B91C1C"/>
            <Text style={s.permanentText}>Delete</Text>
          </TouchableOpacity>}
        </View>) }
    </ScrollView>
    <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
      <View style={s.scrim}><View style={s.modalBox}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{modal==='add'?'Add Staff Account':modal==='edit'?'Edit User':modal==='view'?'User Details':modal==='activate'?'Reactivate User?':modal==='deactivate'?'Deactivate User?':'Delete User Permanently?'}</Text>
          <TouchableOpacity disabled={busy} onPress={close}><Ionicons name="close-circle-outline" size={25} color="#64748B"/></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {(modal==='add' || modal==='edit') && <>
            {formBody}
            {modal==='edit' && <Text style={s.finePrint}>User role, IDs and password cannot be edited from this form. Status is managed separately.</Text>}
          </>}
          {modal === 'view' && !!selected && <View style={s.infoBox}>
            {[
              ['Name',fullName(selected)],['User ID',selected.userId],['Role',roleName(selected.role)],
              ['Role ID',idFor(selected)],['Email',selected.email || '—'],['Phone',selected.phone || '—'],
              ['NIC',selected.nic || '—'],['Language',selected.language || '—'],['Status',selected.status || '—']
            ].map(([label,value])=><View key={label} style={s.infoRow}><Text style={s.infoKey}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>)}
          </View>}
          {(modal==='activate'||modal==='deactivate') && <>
            <Text style={s.confirmText}>{modal==='activate'?'Reactivate':'Deactivate'} {fullName(selected)}?</Text>
            <Text style={s.finePrint}>{modal==='activate' ?
              'This user will be able to sign in again. Any previously revoked caregiver links remain revoked and require new consent.' :
              'This user will lose access immediately. Their account and medical records remain stored in MongoDB.'}</Text>
          </>}
          {modal==='permanent' && <>
            <Text style={s.confirmText}>Are you sure you want to delete {fullName(selected)}?</Text>
            <Text style={s.finePrint}>
              This permanently removes the staff account and cannot be undone.
              The account will only be deleted if it is not linked to hospital records.
              This does not delete patient or hospital records.
            </Text>
          </>}
          {!!error && <Text style={s.error}>{error}</Text>}
          {modal!=='view' && <TouchableOpacity disabled={busy}
            onPress={modal==='add'||modal==='edit'?save:modal==='permanent'?confirmPermanent:confirmStatus}
            style={[s.confirmButton,(modal==='deactivate'||modal==='permanent')&&s.dangerButton,busy&&{opacity:0.4}]}>
            {busy ? <ActivityIndicator color="#FFFFFF"/> : <Text style={s.confirmButtonText}>{modal==='add'?'Add Staff':modal==='edit'?'Save Changes':modal==='activate'?'Reactivate User':modal==='deactivate'?'Deactivate User':'Delete Account'}</Text>}
          </TouchableOpacity>}
          <TouchableOpacity disabled={busy} style={s.cancelButton} onPress={close}><Text style={s.cancelText}>{modal==='view'?'Close':'Cancel'}</Text></TouchableOpacity>
        </ScrollView>
      </View></View>
    </Modal>
  </View></View>;
}

const s = StyleSheet.create({
  outer:{flex:1,backgroundColor:'#EDF1F5'},screen:{flex:1,width:'100%',maxWidth:760,alignSelf:'center',backgroundColor:'#F8F7FC'},
  topbar:{padding:14,backgroundColor:'#FFFFFF',borderBottomWidth:1,borderColor:'#E5E7EB',flexDirection:'row',alignItems:'center',gap:12},
  topIcon:{width:36,height:36,justifyContent:'center',alignItems:'center',backgroundColor:'#EEF4FF',borderRadius:10},
  headerTitle:{fontSize:17,fontWeight:'800',color:'#111827'},headerSub:{color:'#94A3B8',fontSize:10},
  content:{padding:16,paddingBottom:45},headingRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:17},
  pageTitle:{fontSize:16,fontWeight:'800',color:'#111827'},hint:{fontSize:10,color:'#64748B',marginTop:4},
  addButton:{backgroundColor:BLUE,borderRadius:10,padding:11,minHeight:38,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},
  addText:{color:'#FFFFFF',fontSize:11,fontWeight:'800'},
  searchRow:{flexDirection:'row',gap:7,alignItems:'center'},search:{flex:1,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#D9E1EC',paddingHorizontal:12,borderRadius:10,height:42,color:'#111827',fontSize:12},
  searchButton:{height:42,width:42,justifyContent:'center',alignItems:'center',borderRadius:10,backgroundColor:BLUE},
  filterTitle:{fontSize:10,fontWeight:'700',color:'#64748B',marginTop:14,marginBottom:7},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:4},chip:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:'#CBD5E1',borderRadius:20,backgroundColor:'#FFFFFF'},
  chipActive:{backgroundColor:'#EAF1FF',borderColor:BLUE},chipText:{fontSize:10,fontWeight:'600',color:'#64748B'},chipTextActive:{color:BLUE,fontWeight:'800'},
  reset:{alignSelf:'flex-start',marginTop:10},resetText:{fontSize:10,color:BLUE,fontWeight:'700'},
  resultText:{fontSize:11,color:'#64748B',fontWeight:'700',marginVertical:13},empty:{padding:25,backgroundColor:'#FFFFFF',borderRadius:12,marginTop:20},
  card:{padding:14,borderRadius:15,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E0E5EC',marginBottom:13},
  cardHead:{flexDirection:'row',alignItems:'center',gap:9,marginBottom:10},avatar:{width:38,height:38,backgroundColor:'#EAF1FF',borderRadius:10,justifyContent:'center',alignItems:'center'},
  avatarText:{fontSize:12,fontWeight:'800',color:BLUE},name:{fontSize:13,fontWeight:'800',color:'#111827'},subtitle:{fontSize:9,color:'#94A3B8',marginTop:2},
  badge:{paddingHorizontal:8,paddingVertical:5,borderRadius:15},active:{backgroundColor:'#ECFDF3'},inactive:{backgroundColor:'#F1F5F9'},pending:{backgroundColor:'#FFFBEB'},badgeText:{fontSize:9,fontWeight:'800'},
  detail:{fontSize:11,color:'#475569',marginVertical:3},actions:{flexDirection:'row',gap:6,marginTop:12,paddingTop:12,borderTopWidth:1,borderTopColor:'#F1F5F9'},
  action:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DBEAFE',borderRadius:9,paddingVertical:10,gap:4},
  actionLabel:{color:BLUE,fontSize:10,fontWeight:'700'},permanentLink:{alignSelf:'flex-end',marginTop:11,flexDirection:'row',alignItems:'center',gap:6},
  permanentText:{fontSize:10,fontWeight:'600',color:'#B91C1C'},
  notice:{backgroundColor:'#ECFDF3',padding:12,borderRadius:10,marginBottom:12},noticeText:{fontSize:11,color:'#166534'},
  error:{fontSize:11,color:'#B91C1C',backgroundColor:'#FEF2F2',padding:10,borderRadius:9,marginVertical:12},
  scrim:{flex:1,backgroundColor:'rgba(15,23,42,0.56)',padding:16,alignItems:'center',justifyContent:'center'},
  modalBox:{backgroundColor:'#FFFFFF',padding:18,borderRadius:20,width:'100%',maxWidth:460,maxHeight:'90%'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},modalTitle:{fontSize:17,fontWeight:'800',color:'#111827',flex:1},
  field:{marginBottom:13},fieldLabel:{fontSize:11,fontWeight:'700',color:'#334155',marginBottom:7},
  input:{height:43,backgroundColor:'#FFFFFF',borderColor:'#CBD5E1',borderWidth:1,paddingHorizontal:12,borderRadius:10,color:'#111827',fontSize:12},
  finePrint:{fontSize:11,color:'#64748B',lineHeight:18,marginVertical:12},confirmText:{fontSize:14,fontWeight:'800',color:'#111827',marginTop:6},
  confirmButton:{minHeight:44,backgroundColor:BLUE,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:12},
  dangerButton:{backgroundColor:'#DC2626'},confirmButtonText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},
  cancelButton:{minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,marginTop:10},cancelText:{fontSize:12,color:'#334155',fontWeight:'700'},
  infoBox:{backgroundColor:'#F8FAFC',padding:12,borderRadius:10},infoRow:{flexDirection:'row',alignItems:'flex-start',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#E5E7EB'},
  infoKey:{width:'30%',color:'#64748B',fontSize:11},infoValue:{flex:1,color:'#111827',fontSize:11,fontWeight:'700'}
});

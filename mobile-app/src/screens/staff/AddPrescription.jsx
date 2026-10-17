import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';
import api from '../../services/api';

const FORMS = ['Tablet (Tab)', 'Capsule (Cap)', 'Syrup', 'Injection', 'Drops', 'Cream'];
const FREQUENCIES = ['1-0-0 (Morning)', '1-0-1 (Twice Daily)', '1-1-1 (TDS)', '0-0-1 (Night)', 'SOS'];
const MEALS = ['Before Meals', 'After Meals', 'With Food'];
const EMPTY = { name: '', strength: '', form: FORMS[0], doseUnits: '1 Tab', frequency: FREQUENCIES[1], meal: MEALS[1], days: 5, qty: '', instructions: '' };
const getErrorMessage = (error) => error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';

function Label({ children }) {
  return <Text className="text-[9px] font-bold text-slate-500 tracking-wider mb-1.5 mt-3">{children}</Text>;
}

function Input(props) {
  return <TextInput placeholderTextColor="#94A3B8" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-900" {...props} />;
}

function Chips({ options, value, onChange }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    {options.map((option) => <TouchableOpacity key={option} onPress={() => onChange(option)} activeOpacity={0.7} className={`mr-2 rounded-lg border px-3 py-2.5 ${option === value ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
      <Text className={`text-[11px] font-semibold ${option === value ? 'text-white' : 'text-slate-600'}`}>{option}</Text>
    </TouchableOpacity>)}
  </ScrollView>;
}

export default function AddPrescriptionScreen({ navigation, route }) {
  const { tokenId, token, name, dept } = route?.params || {};
  const [consultationId, setConsultationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [medicines, setMedicines] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadConsultation = async () => {
      if (!tokenId) {
        setLoadingError('A valid token is required to find the consultation. Return to the consultation list and select a completed patient.');
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/consultations/token/${encodeURIComponent(tokenId)}`);
        const consultation = response.data?.data;
        if (!consultation?.consultationId) throw new Error('The consultation record was not found for this token.');
        if (!consultation.startedAt || !consultation.endedAt) throw new Error('A prescription can only be added after the consultation is completed.');
        if (mounted) setConsultationId(consultation.consultationId);
      } catch (error) {
        if (mounted) setLoadingError(getErrorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConsultation();
    return () => { mounted = false; };
  }, [tokenId]);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const addMedicine = () => {
    const medicineName = form.name.trim();
    const dosage = [form.doseUnits.trim(), form.strength.trim()].filter(Boolean).join(' ');
    const duration = `${form.days} days`;
    if (!medicineName || !dosage || !form.frequency.trim() || !duration.trim()) {
      Alert.alert('Medicine details required', 'Enter the medicine name, dosage, frequency, and duration.');
      return;
    }
    setMedicines((current) => [...current, {
      id: `${Date.now()}-${current.length}`,
      medicineName,
      dosage,
      frequency: form.frequency.trim(),
      duration,
      instructions: [form.meal, form.qty.trim() ? `Quantity: ${form.qty.trim()}` : '', form.instructions.trim()].filter(Boolean).join('. '),
      displayName: `${medicineName}${form.strength.trim() ? ` ${form.strength.trim()}` : ''}`,
    }]);
    setForm(EMPTY);
  };

  const submit = async () => {
    if (saving) return;
    if (!consultationId) {
      Alert.alert('Consultation unavailable', loadingError || 'The consultation could not be resolved.');
      return;
    }
    if (!medicines.length) {
      Alert.alert('No medicines added', 'Add at least one medicine before confirming.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        consultationId,
        medicines: medicines.map(({ medicineName, dosage, frequency, duration, instructions }) => ({ medicineName, dosage, frequency, duration, instructions })),
        notes: notes.trim(),
      };
      const response = await api.post('/prescriptions', payload);
      if (!response.data?.success || !response.data?.data?.prescriptionId) throw new Error(response.data?.message || 'The server did not confirm that the prescription was saved.');
      Alert.alert('Prescription saved', `Saved for ${name || 'patient'} (${token || tokenId}).`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could not save prescription', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const footer = <View className="px-4 py-3 bg-white border-t border-slate-100">
    <TouchableOpacity activeOpacity={0.8} disabled={saving || loading || !!loadingError || !consultationId} onPress={submit} className="bg-[#0052CC] rounded-xl py-3.5 flex-row items-center justify-center" style={{ opacity: saving || loading || !!loadingError || !consultationId ? 0.5 : 1 }}>
      {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><Text className="text-xs font-bold text-white mr-1.5">CONFIRM PRESCRIPTION</Text><Ionicons name="arrow-forward" size={14} color="#FFFFFF" /></>}
    </TouchableOpacity>
  </View>;

  return <StaffScreen title="ADD PRESCRIPTION" badge={token || ''} footer={footer}>
    <Text className="text-xs text-slate-500 mb-2">{name || 'Patient'} · {dept || 'OPD'}</Text>
    {loading ? <View className="py-8 items-center"><ActivityIndicator size="large" color="#0052CC" /><Text className="text-xs text-slate-500 mt-3">Loading consultation...</Text></View> : loadingError ? <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><Text className="text-xs text-red-700">{loadingError}</Text><TouchableOpacity onPress={() => navigation.goBack()} className="mt-3"><Text className="text-xs font-bold text-red-800">RETURN TO CONSULTATIONS</Text></TouchableOpacity></View> : <>
      <View className="bg-white border border-dashed border-blue-300 rounded-2xl p-4 mb-4">
        <Text className="text-xs font-bold text-blue-700">Add Medicine</Text>
        <Label>MEDICINE NAME</Label><Input placeholder="e.g. Azithromycin" value={form.name} onChangeText={set('name')} />
        <View className="flex-row" style={{ gap: 10 }}><View className="flex-1"><Label>STRENGTH</Label><Input placeholder="500 mg" value={form.strength} onChangeText={set('strength')} /></View><View className="flex-1"><Label>DOSAGE</Label><Input placeholder="1 Tab" value={form.doseUnits} onChangeText={set('doseUnits')} /></View></View>
        <Label>FORM</Label><Chips options={FORMS} value={form.form} onChange={set('form')} />
        <Label>FREQUENCY</Label><Chips options={FREQUENCIES} value={form.frequency} onChange={set('frequency')} />
        <Label>MEAL RELATION</Label><Chips options={MEALS} value={form.meal} onChange={set('meal')} />
        <View className="flex-row" style={{ gap: 10 }}><View className="flex-1"><Label>DURATION (DAYS)</Label><Input keyboardType="number-pad" value={String(form.days)} onChangeText={(value) => setForm((current) => ({ ...current, days: Math.max(1, parseInt(value, 10) || 1) }))} /></View><View className="flex-1"><Label>TOTAL QUANTITY</Label><Input placeholder="10 Tabs" value={form.qty} onChangeText={set('qty')} /></View></View>
        <Label>MEDICINE INSTRUCTIONS</Label><Input placeholder="Optional instructions" value={form.instructions} onChangeText={set('instructions')} />
        <TouchableOpacity activeOpacity={0.8} onPress={addMedicine} className="mt-4 bg-sky-50 border border-sky-200 rounded-xl py-3 flex-row items-center justify-center"><Ionicons name="add" size={16} color="#0369A1" /><Text className="text-xs font-bold text-sky-700 ml-1.5">ADD TO PRESCRIPTION</Text></TouchableOpacity>
      </View>
      <Text className="text-[11px] font-bold text-slate-800 mb-2">MEDICINES ({medicines.length})</Text>
      {medicines.map((medicine) => <View key={medicine.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2"><View className="flex-row justify-between"><Text className="flex-1 text-sm font-bold text-slate-900">{medicine.displayName}</Text><TouchableOpacity onPress={() => setMedicines((current) => current.filter((item) => item.id !== medicine.id))}><Ionicons name="trash-outline" size={16} color="#EF4444" /></TouchableOpacity></View><Text className="text-xs text-slate-500 mt-1">{medicine.dosage} · {medicine.frequency} · {medicine.duration}</Text><Text className="text-xs text-slate-500 mt-1">{medicine.instructions}</Text></View>)}
      <Label>PRESCRIPTION NOTES</Label><Input placeholder="Optional notes" multiline value={notes} onChangeText={setNotes} />
    </>}
  </StaffScreen>;
}

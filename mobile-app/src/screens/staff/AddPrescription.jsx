import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';

const FORMS = ['Tablet (Tab)', 'Capsule (Cap)', 'Syrup', 'Injection', 'Drops', 'Cream'];
const FREQUENCIES = ['1-0-0 (Morning)', '1-0-1 (Twice Daily)', '1-1-1 (TDS)', '0-0-1 (Night)', 'SOS'];
const MEALS = ['Before Meals', 'After Meals', 'With Food'];

const EMPTY = {
  name: '',
  strength: '',
  form: FORMS[0],
  doseUnits: '1 Tab',
  frequency: FREQUENCIES[1],
  meal: MEALS[1],
  days: 5,
  qty: '',
  notes: '',
};

function Label({ children }) {
  return <Text className="text-[9px] font-bold text-slate-500 tracking-wider mb-1.5 mt-3">{children}</Text>;
}

function Input(props) {
  return (
    <TextInput
      placeholderTextColor="#94A3B8"
      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-900"
      {...props}
    />
  );
}

function Chips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {options.map((o) => {
        const active = o === value;
        return (
          <TouchableOpacity
            key={o}
            onPress={() => onChange(o)}
            activeOpacity={0.7}
            className={`mr-2 rounded-lg border px-3 py-2.5 ${
              active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
            }`}
          >
            <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function AddPrescriptionScreen({ navigation, route }) {
  const token = route?.params?.token || 'A-119';
  const patientName = route?.params?.name || 'Sunil Perera';

  const [form, setForm] = useState(EMPTY);
  const [drugs, setDrugs] = useState([]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const addDrug = () => {
    if (!form.name.trim()) {
      Alert.alert('Drug name required', 'Please enter the drug name.');
      return;
    }
    setDrugs((prev) => [...prev, { ...form, id: String(Date.now()) }]);
    setForm(EMPTY);
  };

  const removeDrug = (id) => setDrugs((prev) => prev.filter((d) => d.id !== id));

  const saveDraft = () => {
    // TODO: POST /prescriptions { token, status: 'draft', drugs }
    Alert.alert('Draft saved', 'Prescription saved as a draft.');
  };

  const confirm = () => {
    if (drugs.length === 0) {
      Alert.alert('No medicines added', 'Add at least one medicine before confirming.');
      return;
    }
    // TODO: POST /prescriptions { token, status: 'confirmed', drugs }
    Alert.alert('Prescription confirmed', `Saved for ${patientName} (${token}).`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const footer = (
    <View className="flex-row px-4 py-3 bg-white border-t border-slate-100" style={{ gap: 10 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={saveDraft}
        className="flex-1 border border-slate-200 bg-slate-50 rounded-xl py-3.5 items-center"
      >
        <Text className="text-xs font-bold text-slate-700">Save Draft</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={confirm}
        className="flex-[2] bg-[#0052CC] rounded-xl py-3.5 flex-row items-center justify-center"
      >
        <Text className="text-xs font-bold text-white mr-1.5">Confirm</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <StaffScreen title="ADD PRESCRIPTION" badge={token} footer={footer}>
      <Text className="text-xs text-slate-500 mb-2">{patientName} · General OPD</Text>

      <View className="flex-row items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
        <Ionicons name="checkmark-circle" size={16} color="#059669" />
        <Text className="flex-1 ml-2 text-[11px] font-semibold text-emerald-700">Allergies: None Recorded</Text>
        <Text className="text-[11px] font-bold text-blue-600">Verify</Text>
      </View>

      {/* Entry form */}
      <View className="bg-white border border-dashed border-blue-300 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="add" size={16} color="#0052CC" />
            <Text className="text-xs font-bold text-blue-700 ml-1">Add Another Medicine</Text>
          </View>
          <Text className="text-[10px] text-slate-400">Entry #{drugs.length + 1}</Text>
        </View>

        <Label>DRUG NAME & GENERIC</Label>
        <Input placeholder="e.g. Azithromycin or Cetirizine" value={form.name} onChangeText={set('name')} />

        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1">
            <Label>STRENGTH</Label>
            <Input placeholder="500 mg" value={form.strength} onChangeText={set('strength')} />
          </View>
          <View className="flex-1">
            <Label>DOSE UNITS</Label>
            <Input placeholder="1 Tab" value={form.doseUnits} onChangeText={set('doseUnits')} />
          </View>
        </View>

        <Label>FORM</Label>
        <Chips options={FORMS} value={form.form} onChange={set('form')} />

        <Label>FREQUENCY</Label>
        <Chips options={FREQUENCIES} value={form.frequency} onChange={set('frequency')} />

        <Label>MEAL RELATION</Label>
        <View className="flex-row border border-slate-200 rounded-lg overflow-hidden">
          {MEALS.map((m) => {
            const active = form.meal === m;
            return (
              <TouchableOpacity
                key={m}
                activeOpacity={0.7}
                onPress={() => set('meal')(m)}
                className={`flex-1 py-2.5 items-center ${active ? 'bg-sky-500' : 'bg-white'}`}
              >
                <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1">
            <Label>DURATION</Label>
            <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2 py-2">
              <TouchableOpacity hitSlop={8} onPress={() => setForm((f) => ({ ...f, days: Math.max(1, f.days - 1) }))}>
                <Ionicons name="remove" size={18} color="#475569" />
              </TouchableOpacity>
              <Text className="text-sm font-bold text-slate-900">{form.days} Days</Text>
              <TouchableOpacity hitSlop={8} onPress={() => setForm((f) => ({ ...f, days: f.days + 1 }))}>
                <Ionicons name="add" size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-1">
            <Label>TOTAL QTY</Label>
            <Input placeholder="10 Tabs" value={form.qty} onChangeText={set('qty')} />
          </View>
        </View>

        <Label>SPECIFIC INSTRUCTIONS</Label>
        <Input
          placeholder="e.g. Take with warm water, avoid dairy"
          value={form.notes}
          onChangeText={set('notes')}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={addDrug}
          className="mt-4 bg-sky-50 border border-sky-200 rounded-xl py-3 flex-row items-center justify-center"
        >
          <Ionicons name="add" size={16} color="#0369A1" />
          <Text className="text-xs font-bold text-sky-700 ml-1.5">Add to Prescription List</Text>
        </TouchableOpacity>
      </View>

      {/* Prescribed list */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">PRESCRIBED DRUGS</Text>
          <View className="bg-blue-100 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-[9px] font-bold text-blue-700">{drugs.length} {drugs.length === 1 ? 'Item' : 'Items'}</Text>
          </View>
        </View>
        <Text className="text-[10px] text-slate-400">Standard OPD Dose</Text>
      </View>

      {drugs.length === 0 ? (
        <View className="bg-white border border-slate-200 rounded-xl p-5 items-center">
          <Text className="text-xs text-slate-400">No medicines added yet.</Text>
        </View>
      ) : (
        drugs.map((d) => (
          <View key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {d.name} {d.strength}
                </Text>
                <View className="border border-blue-300 rounded px-1.5 py-0.5 ml-2">
                  <Text className="text-[8px] font-bold text-blue-600">{d.form.split(' ')[0].toUpperCase()}</Text>
                </View>
              </View>
              <TouchableOpacity hitSlop={8} onPress={() => removeDrug(d.id)}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-slate-500 mt-1">
              {d.doseUnits} · {d.frequency}
            </Text>
            <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
              <View className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <Text className="text-[10px] font-semibold text-amber-700">{d.meal}</Text>
              </View>
              <View className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <Text className="text-[10px] font-semibold text-slate-600">Duration: {d.days} Days</Text>
              </View>
              {!!d.qty && (
                <View className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                  <Text className="text-[10px] font-semibold text-slate-600">Dispense: {d.qty}</Text>
                </View>
              )}
            </View>
            {!!d.notes && (
              <Text className="text-[10px] italic text-slate-500 mt-2">Note: {d.notes}</Text>
            )}
          </View>
        ))
      )}
    </StaffScreen>
  );
}
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import EveryoneMessagesView from './EveryoneMessagesView';
import MyInboxView from './MyInboxView';

const SCOPES = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'mine', label: 'My inbox' },
];

// initialScope / scopeSignal come from the header bell's "See all"
export default function MessagesTab({ refreshKey, initialScope, scopeSignal }) {
  const [scope, setScope] = useState('everyone');

  useEffect(() => {
    if (initialScope) setScope(initialScope);
  }, [initialScope, scopeSignal]);

  return (
    <View className="flex-1">
      <View className="px-4 pb-2.5">
        <View className="flex-row bg-slate-200/70 rounded-lg p-0.5 self-start">
          {SCOPES.map((s) => {
            const active = scope === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.8}
                onPress={() => setScope(s.key)}
                className={`px-4 py-1.5 rounded-md ${active ? 'bg-white' : ''}`}
              >
                <Text
                  className={`text-[11px] ${
                    active ? 'font-bold text-sky-700' : 'font-semibold text-slate-500'
                  }`}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {scope === 'mine' ? (
        <MyInboxView refreshKey={refreshKey} />
      ) : (
        <EveryoneMessagesView refreshKey={refreshKey} />
      )}
    </View>
  );
}
import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';

type Props = {
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onFocus?: () => void;
  containerStyle?: ViewStyle;
  onLayout?: (e: LayoutChangeEvent) => void;
};

export default function MessageInput({
  text,
  setText,
  onSend,
  onPickImage,
  onFocus,
  containerStyle,
  onLayout,
}: Props) {
  return (
    <View style={[s.row, containerStyle]} onLayout={onLayout}>
      <Pressable style={s.icon} onPress={onPickImage}>
        <Text>🖼️</Text>
      </Pressable>
      <TextInput
        style={s.input}
        value={text}
        onChangeText={setText}
        placeholder="Message"
        multiline
        onFocus={onFocus}
      />
      <Pressable style={s.send} onPress={onSend}>
        <Text style={s.sendT}>Send</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  icon: { paddingHorizontal: 8, paddingVertical: 6 },
  send: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendT: { color: '#fff', fontWeight: '600' },
});

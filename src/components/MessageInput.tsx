import React, { useState } from 'react';
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
  onTakePhoto: () => void;
  onFocus?: () => void;
  containerStyle?: ViewStyle;
  onLayout?: (e: LayoutChangeEvent) => void;
};

export default function MessageInput({
  text,
  setText,
  onSend,
  onPickImage,
  onTakePhoto,
  onFocus,
  containerStyle,
  onLayout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  const handlePick = () => {
    closeMenu();
    onPickImage();
  };
  const handleCamera = () => {
    closeMenu();
    onTakePhoto();
  };

  return (
    <View style={[s.wrapper, containerStyle]} onLayout={onLayout}>
      <View style={s.buttonMenuPosition}>
        <Pressable style={s.plusBtn} onPress={menuOpen ? closeMenu : openMenu}>
          <Text style={s.plusText}>+</Text>
        </Pressable>

        {menuOpen && (
          <View style={s.menu}>
            <Pressable style={s.menuItem} onPress={handlePick}>
              <Text style={s.menuText}>Choose from gallery</Text>
            </Pressable>
            <View style={s.sep} />
            <Pressable style={s.menuItem} onPress={handleCamera}>
              <Text style={s.menuText}>Use camera</Text>
            </Pressable>
          </View>
        )}
      </View>

      <TextInput
        style={s.input}
        value={text}
        onChangeText={setText}
        placeholder="Message"
        multiline
        onFocus={onFocus}
        onBlur={closeMenu}
      />

      <Pressable style={s.send} onPress={onSend}>
        <Text style={s.sendT}>Send</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { color: '#fff', fontSize: 24, lineHeight: 24, fontWeight: '700' },

  menu: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    minWidth: 200,
    backgroundColor: '#222',
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 8,
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 12 },
  menuText: { color: '#fff', fontSize: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#555' },

  send: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendT: { color: '#fff', fontWeight: '600' },
  buttonMenuPosition: { position: 'relative' },
});

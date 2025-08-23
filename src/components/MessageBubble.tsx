import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import { Message } from '@services/db';

function MessageBubble({ msg }: { msg: Message }) {
  const mine = msg.senderId === auth().currentUser?.uid;
  return (
    <View style={[s.b, mine ? s.mine : s.theirs]}>
      {msg.type === 'image' ? (
        <Image source={{ uri: msg.imageUrl }} style={s.img} />
      ) : (
        <Text style={[s.txt, mine ? s.txtMine : s.txtTheirs]}>{msg.text}</Text>
      )}
    </View>
  );
}

export default memo(MessageBubble);

const s = StyleSheet.create({
  b: { padding: 10, borderRadius: 16, maxWidth: '80%', marginVertical: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#4f93ff' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#e23a3a' },
  txt: { fontSize: 16 },
  txtMine: { color: '#fff' },
  txtTheirs: { color: '#111' },
  img: { width: 200, height: 200, borderRadius: 12 },
});

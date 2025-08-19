import database from '@react-native-firebase/database';

export type RTDBServerTimestamp = typeof database.ServerValue.TIMESTAMP;
export type RTDBTimestamp = number | RTDBServerTimestamp;

import { useEffect, useRef, useState } from 'react';
import { FirebaseDatabaseTypes } from '@react-native-firebase/database';

type MapFn<T> = (snap: FirebaseDatabaseTypes.DataSnapshot) => T;

type Options<T> = {
  /** Filter items client-side */
  filter?: (item: T) => boolean;
  /** Sort items client-side */
  sort?: (a: T, b: T) => number;
};

export default function useRealtimeList<T>(
  refOrQuery: FirebaseDatabaseTypes.Query | FirebaseDatabaseTypes.Reference,
  mapFn: MapFn<T>,
  event: 'child_added' | 'value' = 'child_added',
  options: Options<T> = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const mapRef = useRef(mapFn);
  mapRef.current = mapFn; // keeps latest mapper without retriggering effect

  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    setItems([]);

    if (event === 'child_added') {
      const q = refOrQuery as FirebaseDatabaseTypes.Query;

      // incremental updates
      const onAdd = (snap: FirebaseDatabaseTypes.DataSnapshot) => {
        setItems(prev => {
          const next = [...prev, mapRef.current(snap)];
          const filtered = optsRef.current.filter
            ? next.filter(optsRef.current.filter)
            : next;
          const sorted = optsRef.current.sort
            ? [...filtered].sort(optsRef.current.sort)
            : filtered;
          return sorted;
        });
      };

      q.on('child_added', onAdd);
      return () => q.off('child_added', onAdd);
    } else {
      const r = refOrQuery as
        | FirebaseDatabaseTypes.Query
        | FirebaseDatabaseTypes.Reference;

      const onValue = (snap: FirebaseDatabaseTypes.DataSnapshot) => {
        const arr: T[] = [];
        snap.forEach(child => {
          arr.push(mapRef.current(child));
          return undefined;
        });
        const filtered = optsRef.current.filter
          ? arr.filter(optsRef.current.filter)
          : arr;
        const sorted = optsRef.current.sort
          ? [...filtered].sort(optsRef.current.sort)
          : filtered;
        setItems(sorted);
      };

      r.on('value', onValue);
      return () => r.off('value', onValue);
    }
  }, [refOrQuery, event]);

  return items;
}

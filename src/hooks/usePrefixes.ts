import {Dispatch, SetStateAction, useEffect, useRef, useState} from 'react';
import {defaultPrefixes} from '../constants/mappings';
import {characters as mainCharacters} from '../data/names';

type CustomSequence = {key: string; seq: string};

const greekCodePoints = new Set((mainCharacters.greek ?? []).map((entry) => entry.cp));
const cyrillicCodePoints = new Set((mainCharacters.cyrillic ?? []).map((entry) => entry.cp));

export function usePrefixes(setCustomSequences: Dispatch<SetStateAction<CustomSequence[]>>) {
	const [prefixes, setPrefixes] = useState(defaultPrefixes);
	const prevPrefixesRef = useRef(prefixes);

	useEffect(() => {
		const prev = prevPrefixesRef.current;
		if (prev.greek.char === prefixes.greek.char && prev.cyrillic.char === prefixes.cyrillic.char) {
			return;
		}

		setCustomSequences((prevCustom) => {
			if (prevCustom.length === 0) return prevCustom;
			let changed = false;
			const updated = prevCustom.map((cs) => {
				const cp = Number(cs.key);
				let {seq} = cs;
				if (!seq || Number.isNaN(cp)) return cs;

				if (prev.greek.char !== prefixes.greek.char && greekCodePoints.has(cp)) {
					const prevLower = prev.greek.char;
					const prevUpper = prevLower.toUpperCase();
					const prevWithSlash = `${prevLower}\\`;
					let replaced = false;

					if (seq.startsWith(prevLower)) {
						// lower-case prefix -> always new lower-case char
						seq = prefixes.greek.char + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevUpper)) {
						// upper-case prefix -> respect current cased flag
						seq = (prefixes.greek.cased ? prefixes.greek.char.toUpperCase() : `${prefixes.greek.char}\\`) + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevWithSlash)) {
						// "char\\" prefix -> also respect current cased flag
						const replacement = prefixes.greek.cased ? prefixes.greek.char.toUpperCase() : `${prefixes.greek.char}\\`;
						seq = replacement + seq.slice(prevWithSlash.length);
						replaced = true;
					}

					if (replaced) {
						changed = true;
						return {...cs, seq};
					}
				}

				if (prev.cyrillic.char !== prefixes.cyrillic.char && cyrillicCodePoints.has(cp)) {
					const prevLower = prev.cyrillic.char;
					const prevUpper = prevLower.toUpperCase();
					const prevWithSlash = `${prevLower}\\`;
					let replaced = false;

					if (seq.startsWith(prevLower)) {
						seq = prefixes.cyrillic.char + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevUpper)) {
						seq = (prefixes.cyrillic.cased ? prefixes.cyrillic.char.toUpperCase() : `${prefixes.cyrillic.char}\\`) + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevWithSlash)) {
						const replacement = prefixes.cyrillic.cased ? prefixes.cyrillic.char.toUpperCase() : `${prefixes.cyrillic.char}\\`;
						seq = replacement + seq.slice(prevWithSlash.length);
						replaced = true;
					}

					if (replaced) {
						changed = true;
						return {...cs, seq};
					}
				}

				return cs;
			});
			return changed ? updated : prevCustom;
		});

		prevPrefixesRef.current = prefixes;
	}, [prefixes, setCustomSequences]);

	return [prefixes, setPrefixes] as const;
}

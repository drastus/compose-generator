import {Dispatch, SetStateAction, useEffect, useRef, useState} from 'react';
import {MATH_FLAGS, composeMathPrefix, defaultPrefixes} from '../constants/mappings';
import {characters as mainCharacters} from '../data/names';
import {CustomSequence} from '../types';

const greekCodePoints = new Set((mainCharacters.greek ?? []).map((entry) => entry.cp));
const cyrillicCodePoints = new Set((mainCharacters.cyrillic ?? []).map((entry) => entry.cp));
const diaCodePoints = new Set((mainCharacters.dia ?? []).map((entry) => entry.cp));
const modifierLetterCodePoints = new Set((mainCharacters.modifier ?? []).map((entry) => entry.cp));
const combCodePoints = new Set((mainCharacters.combining ?? []).map((entry) => entry.cp));
const currencyCodePoints = new Set((mainCharacters.currency ?? []).map((entry) => entry.cp));

const mathStyleCodePoints: Record<string, Set<number>> = Object.fromEntries(
	Object.keys(MATH_FLAGS).map((styleKey) => [
		styleKey,
		new Set((mainCharacters.math_alphanumerics ?? [])
			.filter((e) => e.template?.[0] === styleKey)
			.map((e) => e.cp)),
	]),
);

export function usePrefixes(setCustomSequences: Dispatch<SetStateAction<CustomSequence[]>>) {
	const [prefixes, setPrefixes] = useState(defaultPrefixes);
	const prevPrefixesRef = useRef(prefixes);

	useEffect(() => {
		const prev = prevPrefixesRef.current;

		const greekChanged = prev.greek.char !== prefixes.greek.char;
		const cyrillicChanged = prev.cyrillic.char !== prefixes.cyrillic.char;
		const diaChanged = prev.dia.char !== prefixes.dia.char;
		const combChanged = prev.comb.char !== prefixes.comb.char;
		const currencyChanged = prev.currency.char !== prefixes.currency.char;
		const modifierLetterChanged = prev.modifierLetter.char !== prefixes.modifierLetter.char;
		const mathChanged = Object.keys(prev.math).some(
			(k) => prev.math[k as keyof typeof prev.math] !== prefixes.math[k as keyof typeof prefixes.math],
		);

		if (!greekChanged && !cyrillicChanged && !diaChanged && !combChanged && !currencyChanged && !modifierLetterChanged && !mathChanged) {
			return;
		}

		setCustomSequences((prevCustom) => {
			if (prevCustom.length === 0) return prevCustom;
			let changed = false;
			const updated = prevCustom.map((cs) => {
				const cp = Number(cs.key);
				let {seq} = cs;
				if (!seq || Number.isNaN(cp)) return cs;

				if (greekChanged && greekCodePoints.has(cp)) {
					const prevLower = prev.greek.char;
					const prevUpper = prevLower.toUpperCase();
					const prevWithSlash = `${prevLower}\\`;
					let replaced = false;

					if (seq.startsWith(prevLower)) {
						seq = prefixes.greek.char + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevUpper)) {
						seq = (prefixes.greek.cased ? prefixes.greek.char.toUpperCase() : `${prefixes.greek.char}\\`) + seq.slice(1);
						replaced = true;
					} else if (seq.startsWith(prevWithSlash)) {
						const replacement = prefixes.greek.cased ? prefixes.greek.char.toUpperCase() : `${prefixes.greek.char}\\`;
						seq = replacement + seq.slice(prevWithSlash.length);
						replaced = true;
					}

					if (replaced) {
						changed = true;
						return {...cs, seq};
					}
				}

				if (cyrillicChanged && cyrillicCodePoints.has(cp)) {
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

				if (diaChanged && diaCodePoints.has(cp) && seq.startsWith(prev.dia.char)) {
					seq = prefixes.dia.char + seq.slice(prev.dia.char.length);
					changed = true;
					return {...cs, seq};
				}

				if (combChanged && combCodePoints.has(cp) && seq.startsWith(prev.comb.char)) {
					seq = prefixes.comb.char + seq.slice(prev.comb.char.length);
					changed = true;
					return {...cs, seq};
				}

				if (currencyChanged && currencyCodePoints.has(cp) && seq.startsWith(prev.currency.char)) {
					seq = prefixes.currency.char + seq.slice(prev.currency.char.length);
					changed = true;
					return {...cs, seq};
				}

				if (modifierLetterChanged && modifierLetterCodePoints.has(cp) && seq.startsWith(prev.modifierLetter.char)) {
					seq = prefixes.modifierLetter.char + seq.slice(prev.modifierLetter.char.length);
					changed = true;
					return {...cs, seq};
				}

				if (mathChanged) {
					for (const [styleKey, cpSet] of Object.entries(mathStyleCodePoints)) {
						if (cpSet.has(cp)) {
							const flags = MATH_FLAGS[styleKey];
							const oldPrefix = composeMathPrefix(prev.math, flags);
							const newPrefix = composeMathPrefix(prefixes.math, flags);
							if (oldPrefix !== newPrefix && seq.startsWith(oldPrefix)) {
								seq = newPrefix + seq.slice(oldPrefix.length);
								changed = true;
								return {...cs, seq};
							}
							break;
						}
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

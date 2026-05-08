import {keySymNames, specialChars} from '../constants/mappings';
import {CharWithSeq} from '../types';

export function formatSequence(sequence: CharWithSeq): string {
	const getKeyName = (key: string) => keySymNames[key]
		?? specialChars.find((sc) => sc.label === key)?.keysym
		?? key;

	const keys = sequence.seq!
		.split('')
		.map((k: string) => `<${getKeyName(k)}>`)
		.join(' ');

	const char = String.fromCodePoint(sequence.cp);
	const codePoint = sequence.cp.toString(16).toUpperCase().padStart(4, '0');

	return `<Multi_key> ${keys} \t: "${char}"\tU${codePoint} # ${sequence.name}`;
}

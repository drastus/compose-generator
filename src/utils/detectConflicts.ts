import {CharWithSeq} from '../types';

export function detectConflicts(allCharsWithSeq: CharWithSeq[]): Map<number, number[]> {
	const conflicts = new Map<number, number[]>();
	const seqMap = new Map<string, number[]>();

	for (const char of allCharsWithSeq) {
		if (!char.seq) continue;
		const existing = seqMap.get(char.seq) || [];
		seqMap.set(char.seq, [...existing, char.cp]);
	}

	for (const char of allCharsWithSeq) {
		if (!char.seq) continue;
		const conflictingCps = new Set<number>();

		const duplicates = seqMap.get(char.seq) || [];
		if (duplicates.length > 1) {
			for (const cp of duplicates) {
				if (cp !== char.cp) conflictingCps.add(cp);
			}
		}

		for (const [otherSeq, otherCps] of seqMap.entries()) {
			if (otherSeq === char.seq) continue;
			if (otherSeq.startsWith(char.seq)) {
				for (const cp of otherCps) conflictingCps.add(cp);
			}
		}

		for (const [otherSeq, otherCps] of seqMap.entries()) {
			if (otherSeq === char.seq) continue;
			if (char.seq.startsWith(otherSeq)) {
				for (const cp of otherCps) conflictingCps.add(cp);
			}
		}

		if (conflictingCps.size > 0) {
			conflicts.set(char.cp, Array.from(conflictingCps));
		}
	}

	return conflicts;
}

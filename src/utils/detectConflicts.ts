import {CharWithSeq} from '../types';

function addConflict(into: Set<number>, cps: number[], ownCp: number) {
	for (const cp of cps) {
		if (cp !== ownCp) into.add(cp);
	}
}

function checkSeqConflicts(seq: string, ownCp: number, seqMap: Map<string, number[]>, conflictingCps: Set<number>) {
	const duplicates = seqMap.get(seq) ?? [];
	if (duplicates.length > 1) addConflict(conflictingCps, duplicates, ownCp);

	for (const [otherSeq, otherCps] of seqMap.entries()) {
		if (otherSeq !== seq && (otherSeq.startsWith(seq) || seq.startsWith(otherSeq))) {
			addConflict(conflictingCps, otherCps, ownCp);
		}
	}
}

export function detectConflicts(allCharsWithSeq: CharWithSeq[]): Map<number, number[]> {
	const conflicts = new Map<number, number[]>();
	const seqMap = new Map<string, number[]>();

	for (const char of allCharsWithSeq) {
		const allSeqs = [char.seq, ...(char.additionalSeqs ?? [])].filter(Boolean) as string[];
		for (const seq of allSeqs) {
			const existing = seqMap.get(seq) ?? [];
			seqMap.set(seq, [...existing, char.cp]);
		}
	}

	for (const char of allCharsWithSeq) {
		const allSeqs = [char.seq, ...(char.additionalSeqs ?? [])].filter(Boolean) as string[];
		if (allSeqs.length === 0) continue;
		const conflictingCps = new Set<number>();
		for (const seq of allSeqs) checkSeqConflicts(seq, char.cp, seqMap, conflictingCps);
		if (conflictingCps.size > 0) conflicts.set(char.cp, Array.from(conflictingCps));
	}

	return conflicts;
}

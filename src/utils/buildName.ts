import {_, C, S, DIGIT_NAMES} from '../constants';
import {NameEntry} from '../types';

const caseLabels = new Set([_, C, S]);

export function buildName(entry: NameEntry): string {
	if (entry.name) return entry.name;
	const nameParts = [];
	if (entry.template) {
		let {template} = entry;
		if (caseLabels.has(entry.template[1])) {
			const letterParts = entry.template[0].split(' ');
			if (entry.template[1]) letterParts.splice(-1, 0, entry.template[1]);
			template = [letterParts.join(' '), ...entry.template.slice(2)];
		}
		template.forEach((part, i) => {
			if (i === 2 && part !== 'ACCENT') nameParts.push('WITH');
			else if (i > 2) nameParts.push('AND');
			if (part.match(/^\d$/)) {
				nameParts.push(`DIGIT ${DIGIT_NAMES[part as keyof typeof DIGIT_NAMES]}`);
				return;
			}
			nameParts.push(part);
		});
	}
	if (entry.end) nameParts.push(entry.end);
	return nameParts.join(' ');
}

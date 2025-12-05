import {NameEntry} from '../names';

export function buildName(entry: NameEntry): string {
	if (entry.name) return entry.name;
	const nameParts = [];
	(entry.template ?? []).forEach((part, i) => {
		if (i === 2) nameParts.push('WITH');
		else if (i > 2) nameParts.push('AND');
		nameParts.push(part);
	});
	if (entry.end) nameParts.push(entry.end);
	return nameParts.join(' ');
}

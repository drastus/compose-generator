export function blockToGroup(blockName: string): string {
	const group = blockToGroupPartial(blockName);
	if (group) return group;

	return blockName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const MUSIC_BLOCKS = new Set([
	'Byzantine Musical Symbols',
	'Musical Symbols',
	'Ancient Greek Musical Notation',
	'Znamenny Musical Notation',
]);

const SCRIPT_BLOCK_PREFIXES: Array<[string, string]> = [
	['Arabic', 'arabic'],
	['Bopomofo', 'bopomofo'],
	['Cherokee', 'cherokee'],
	['Cyrillic', 'cyrillic'],
	['Devanagari', 'devanagari'],
	['Ethiopic', 'ethiopic'],
	['Georgian', 'georgian'],
	['Hangul', 'hangul'],
	['Katakana', 'katakana'],
	['Khmer', 'khmer'],
	['Linear B', 'linear_b'],
	['Mongolian', 'mongolian'],
	['Myanmar', 'myanmar'],
	['Sinhala', 'sinhala'],
	['Sundanese', 'sundanese'],
	['Syriac', 'syriac'],
	['Tamil', 'tamil'],
	['Unified Canadian Aboriginal Syllabics', 'unified_canadian_aboriginal_syllabics'],
	['Yi ', 'yi'], // 'Yi ' (with space) avoids matching 'Yijing Hexagram Symbols'
];

export function blockToGroupPartial(blockName: string): string | undefined {
	for (const [prefix, group] of SCRIPT_BLOCK_PREFIXES) {
		if (blockName.startsWith(prefix)) return group;
	}
	if (MUSIC_BLOCKS.has(blockName)) return 'music';
	return undefined;
}

export const groupPrimaryBlock: Record<string, string> = {
	cyrillic: 'Cyrillic',
	arabic: 'Arabic',
	hebrew: 'Hebrew',
};

export function blockToGroup(blockName: string): string {
	const group = blockToGroupPartial(blockName);
	if (group) return group;

	return blockName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function blockToGroupPartial(blockName: string): string | undefined {
	if (blockName.startsWith('Cyrillic')) return 'cyrillic';
	if (blockName.startsWith('Arabic')) return 'arabic';
	return undefined;
}

export const groupPrimaryBlock: Record<string, string> = {
	cyrillic: 'Cyrillic',
	arabic: 'Arabic',
	hebrew: 'Hebrew',
};

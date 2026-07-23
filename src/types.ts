export type NameEntry = {
	cp: number,
	name?: string,
	end?: string,
	template?: string[],
	set?: string[],
	defaultSeq?: string,
	altSeq?: string,
	/** Unicode general category (e.g. 'Lu', 'Zs', 'Pd'), from UnicodeData.txt. */
	cat?: string,
};

export type CharWithSeq = {
	cp: number,
	name: string,
	seq?: string,
	additionalSeqs?: string[],
	conflicts?: number[],
};

export type CustomSequence = {
	key: string;
	seq: string;
	additionalSeqs?: string[];
};

export type DiacriticMark = {
	name: string,
	mark: string,
	key: string,
};

export type SpecialChar = {
	label: string,
	name: string,
	keysym: string,
};

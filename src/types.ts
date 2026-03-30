export type NameEntry = {
	cp: number,
	name?: string,
	end?: string,
	template?: string[],
	set?: string[],
	defaultSeq?: string,
	altSeq?: string,
};

export type CharWithSeq = {
	cp: number,
	name: string,
	seq?: string,
	conflicts?: number[],
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

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

export const Formats: import('../sim/dex-formats').FormatList = [
	{
		section: "S/V Singles",
	},
	{
		name: "[Gen 9] Random Battle",
		mod: 'gen9',
		team: 'random',
		ruleset: ['PotD', 'HP Percentage Mod', 'Cancel Mod'],
	},
	{
		name: "[Gen 9] Custom Game",
		mod: 'gen9',
		searchShow: false,
		debug: true,
		battle: { trunc: Math.trunc },
		ruleset: ['Team Preview', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
];

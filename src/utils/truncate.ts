export default function truncate(input: string, lim = 40): string {
	if (input.length > lim) {
		return `${input.substring(0, lim)}…`;
	}

	return input;
}

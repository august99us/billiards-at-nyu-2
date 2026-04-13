import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = ({ params }) => {
	return { tournamentId: params.id };
};

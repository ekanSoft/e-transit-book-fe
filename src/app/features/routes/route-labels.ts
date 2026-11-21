import type { CreateRoute, Route, RouteTerminal } from '../workspace/workspace-data';

export function terminalName(terminal: RouteTerminal | null) {
  return terminal?.name?.trim() || 'Terminal unavailable';
}

export function terminalLocation(terminal: RouteTerminal | null) {
  const address = terminal?.address;
  const parts = [address?.city?.trim(), address?.state?.trim() || address?.stateCode?.trim()];
  return parts.filter(Boolean).join(', ');
}

export function findDirectionalRoute(routes: readonly Route[], pair: CreateRoute) {
  return routes.find(
    ({ originBranch, destinationBranch }) =>
      originBranch?._id === pair.originBranch && destinationBranch?._id === pair.destinationBranch,
  );
}

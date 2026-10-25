import basePlayers from '../../data/players.json'

export { basePlayers }
export const playerIds = new Set(basePlayers.map((p) => p.id))

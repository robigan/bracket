import aiofiles.os

from bracket.sql.teams import get_team_by_id
from bracket.utils.id_types import TeamId, TournamentId


async def get_team_logo_path(tournament_id: TournamentId, team_id: TeamId) -> str | None:
    team = await get_team_by_id(team_id, tournament_id)
    logo_path = (
        f"static/team-logos/{team.logo_path}" if team is not None and team.logo_path is not None else None
    )
    return logo_path if logo_path is not None and await aiofiles.os.path.exists(logo_path) else None


async def delete_team_logo(tournament_id: TournamentId, team_id: TeamId) -> None:
    logo_path = await get_team_logo_path(tournament_id, team_id)
    if logo_path is not None:
        await aiofiles.os.remove(logo_path)

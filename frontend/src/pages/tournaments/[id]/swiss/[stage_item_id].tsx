import { Button, Grid, Group, SegmentedControl, Title } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';
import { SWRResponse } from 'swr';

import NotFoundTitle from '../../../404';
import Brackets from '../../../../components/brackets/brackets';
import Scheduler from '../../../../components/scheduling/scheduling';
import classes from '../../../../components/utility.module.css';
import { useRouterQueryState } from '../../../../components/utils/query_parameters';
import {
  getStageItemIdFromRouter,
  getTournamentIdFromRouter,
  responseIsValid,
} from '../../../../components/utils/util';
import { BracketDisplaySettings } from '../../../../interfaces/brackets';
import { SchedulerSettings } from '../../../../interfaces/match';
import { RoundInterface } from '../../../../interfaces/round';
import { StageWithStageItems, getStageById } from '../../../../interfaces/stage';
import {
  StageItemWithRounds,
  stageItemIsHandledAutomatically,
} from '../../../../interfaces/stage_item';
import { getTournamentEndpoint } from '../../../../interfaces/tournament';
import {
  checkForAuthError,
  getStages,
  getTournamentById,
  getUpcomingMatches,
} from '../../../../services/adapter';
import { getStageItemLookup } from '../../../../services/lookups';
import TournamentLayout from '../../_tournament_layout';

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export default function TournamentPage() {
  const { id, tournamentData } = getTournamentIdFromRouter();
  const stageItemId = getStageItemIdFromRouter();
  const { t } = useTranslation();

  const swrTournamentResponse = getTournamentById(tournamentData.id);
  checkForAuthError(swrTournamentResponse);
  const swrStagesResponse: SWRResponse = getStages(id);
  const [onlyRecommended, setOnlyRecommended] = useRouterQueryState('only-recommended', 'true');
  const [eloThreshold, setEloThreshold] = useRouterQueryState('max-elo-diff', 100);
  const [iterations, setIterations] = useRouterQueryState('iterations', 1000);
  const [limit, setLimit] = useRouterQueryState('limit', 50);
  const [matchVisibility, setMatchVisibility] = useRouterQueryState('match-visibility', 'all');
  const [teamNamesDisplay, setTeamNamesDisplay] = useRouterQueryState('which-names', 'team-names');
  const displaySettings: BracketDisplaySettings = {
    matchVisibility,
    setMatchVisibility,
    teamNamesDisplay,
    setTeamNamesDisplay,
  };

  const schedulerSettings: SchedulerSettings = {
    eloThreshold,
    setEloThreshold,
    onlyRecommended,
    setOnlyRecommended,
    limit,
    setLimit,
    iterations,
    setIterations,
  };

  const tournamentDataFull =
    swrTournamentResponse.data != null ? swrTournamentResponse.data.data : null;

  let activeStage: StageWithStageItems | null = null;
  let draftRound: RoundInterface | null = null;
  let stageItem: StageItemWithRounds | null = null;

  if (responseIsValid(swrStagesResponse)) {
    stageItem = getStageItemLookup(swrStagesResponse)[stageItemId] ?? null;
    [activeStage] = getStageById(swrStagesResponse, stageItem.stage_id);

    if (activeStage != null && activeStage.stage_items != null) {
      const draftRounds = stageItem.rounds.filter(
        (round: RoundInterface) => round.stage_item_id === stageItemId
      );

      if (draftRounds != null && draftRounds.length > 0) {
        [draftRound] = draftRounds;
      }
    }
  }

  const swrUpcomingMatchesResponse = getUpcomingMatches(
    id,
    draftRound?.id ?? null,
    schedulerSettings
  );
  const scheduler =
    draftRound != null &&
    stageItem != null &&
    !stageItemIsHandledAutomatically(stageItem) &&
    activeStage != null &&
    swrUpcomingMatchesResponse != null ? (
      <>
        <Scheduler
          activeStage={activeStage}
          draftRound={draftRound}
          tournamentData={tournamentDataFull}
          swrRoundsResponse={swrStagesResponse}
          swrUpcomingMatchesResponse={swrUpcomingMatchesResponse}
          schedulerSettings={schedulerSettings}
          displaySettings={displaySettings}
        />
      </>
    ) : null;

  if (!swrTournamentResponse.isLoading && tournamentDataFull == null) {
    return <NotFoundTitle />;
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Grid grow>
        <Grid.Col span={6}>
          <Title>{stageItem != null ? stageItem.name : ''}</Title>
        </Grid.Col>
        <Grid.Col span={6}>
          <Group justify="right">
            <SegmentedControl
              className={classes.fullWithMobile}
              value={matchVisibility}
              onChange={setMatchVisibility}
              data={[
                { label: t('match_filter_option_all'), value: 'all' },
                { label: t('match_filter_option_past'), value: 'future-only' },
                { label: t('match_filter_option_current'), value: 'present-only' },
              ]}
            />
            <SegmentedControl
              className={classes.fullWithMobile}
              value={teamNamesDisplay}
              onChange={setTeamNamesDisplay}
              data={[
                { label: t('name_filter_options_team'), value: 'team-names' },
                { label: t('name_filter_options_player'), value: 'player-names' },
              ]}
            />
            <Button
              className={classes.fullWithMobile}
              color="blue"
              size="sm"
              variant="outline"
              leftSection={<IconExternalLink size={24} />}
              onClick={() => {
                const endpoint = getTournamentEndpoint(tournamentDataFull);
                window.open(`/tournaments/${endpoint}/dashboard`, '_ blank');
              }}
            >
              {t('view_dashboard_button')}
            </Button>
          </Group>
        </Grid.Col>
      </Grid>
      <div style={{ marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
        <Brackets
          tournamentData={tournamentDataFull}
          swrStagesResponse={swrStagesResponse}
          swrUpcomingMatchesResponse={swrUpcomingMatchesResponse}
          readOnly={false}
          stageItem={stageItem!} // TODO: Actually check if stageItem exists before using it, remove this once proper checks are in place
          displaySettings={displaySettings}
        />
        {scheduler}
      </div>
    </TournamentLayout>
  );
}

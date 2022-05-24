import { useState, useCallback, FC } from 'react';
import styled from 'styled-components';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { DesktopOnlyView } from 'components/Media';

import {
	PageContent,
	FullHeightContainer,
	MainContent,
	RightSideContent,
	LeftSideContent,
} from 'styles/common';
import { useTranslation } from 'react-i18next';

import MarketInfo from 'sections/futures/MarketInfo';
import Trade from 'sections/futures/Trade';
import { PotentialTrade } from 'sections/futures/types';
import TradingHistory from 'sections/futures/TradingHistory';
import { CurrencyKey } from 'constants/currency';
import useGetFuturesOpenOrders from 'queries/futures/useGetFuturesOpenOrders';
import { getMarketKey } from 'utils/futures';
import useGetFuturesPositionForMarket from 'queries/futures/useGetFuturesPositionForMarket';
import Connector from 'containers/Connector';
import AppLayout from 'sections/shared/Layout/AppLayout';

type AppLayoutProps = {
	children: React.ReactNode;
};

type MarketComponent = FC & { layout: FC<AppLayoutProps> };

const Market: MarketComponent = () => {
	const { t } = useTranslation();
	const router = useRouter();

	const [potentialTrade, setPotentialTrade] = useState<PotentialTrade | null>(null);
	const marketAsset = (router.query.market?.[0] as CurrencyKey) ?? null;
	const { network } = Connector.useContainer();

	const futuresMarketPositionQuery = useGetFuturesPositionForMarket(
		getMarketKey(marketAsset, network.id)
	);

	const futuresMarketPosition = futuresMarketPositionQuery?.data ?? null;

	const openOrdersQuery = useGetFuturesOpenOrders(marketAsset);
	const openOrders = openOrdersQuery?.data ?? [];

	const refetch = useCallback(() => {
		futuresMarketPositionQuery.refetch();
		openOrdersQuery.refetch();
	}, [futuresMarketPositionQuery, openOrdersQuery]);

	return (
		<>
			<Head>
				<title>{t('futures.market.page-title', { pair: router.query.market })}</title>
			</Head>
			<StyledPageContent>
				<StyledFullHeightContainer>
					<DesktopOnlyView>
						<StyledLeftSideContent>
							<TradingHistory currencyKey={marketAsset} />
						</StyledLeftSideContent>
					</DesktopOnlyView>
					<StyledMainContent>
						<MarketInfo
							market={marketAsset}
							position={futuresMarketPosition}
							openOrders={openOrders}
							refetch={refetch}
							potentialTrade={potentialTrade}
						/>
					</StyledMainContent>
					<DesktopOnlyView>
						<StyledRightSideContent>
							<Trade
								onEditPositionInput={setPotentialTrade}
								refetch={refetch}
								position={futuresMarketPosition}
								currencyKey={marketAsset}
							/>
						</StyledRightSideContent>
					</DesktopOnlyView>
				</StyledFullHeightContainer>
			</StyledPageContent>
		</>
	);
};

Market.layout = AppLayout;

export default Market;

const StyledPageContent = styled(PageContent)``;

const StyledFullHeightContainer = styled(FullHeightContainer)`
	display: grid;
	grid-template-columns: 20% 60% 20%;
	column-gap: 15px;
	width: calc(100% - 30px);
`;

const StyledMainContent = styled(MainContent)`
	max-width: unset;
	margin: unset;
`;

const StyledRightSideContent = styled(RightSideContent)`
	width: 100%;
`;

const StyledLeftSideContent = styled(LeftSideContent)`
	width: 100%;
`;

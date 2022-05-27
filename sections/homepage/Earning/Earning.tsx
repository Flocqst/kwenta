import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';

import {
	FlexDivCentered,
	FlexDivCol,
	FlexDivColCentered,
	FlexDivRow,
	SmallGoldenHeader,
	WhiteHeader,
} from 'styles/common';
import { Copy, Title } from '../common';

import ArrowUpRightIcon from 'assets/svg/app/arrow-up-right.svg';
import StakeToEarnIcon from 'assets/svg/earn/stake-to-earn.svg';
import TradeToEarnIcon from 'assets/svg/earn/trade-to-earn.svg';
import VoteNGovernIcon from 'assets/svg/earn/vote-n-govern.svg';

import Link from 'next/link';
import ROUTES from 'constants/routes';
import Button from 'components/Button';
import useGetFuturesCumulativeStats from 'queries/futures/useGetFuturesCumulativeStats';
import Loader from 'components/Loader';
import { formatCurrency, formatNumber, zeroBN } from 'utils/formatters/number';
import { Synths } from 'constants/currency';

const EARNINGS = [
	{
		id: 'stake-to-earn',
		title: 'homepage.earning.stake-to-earn.title',
		copy: 'homepage.earning.stake-to-earn.copy',
		image: <StakeToEarnIcon />,
	},
	{
		id: 'trade-to-earn',
		title: 'homepage.earning.trade-to-earn.title',
		copy: 'homepage.earning.trade-to-earn.copy',
		image: <TradeToEarnIcon />,
	},
	{
		id: 'vote-and-govern',
		title: 'homepage.earning.vote-and-govern.title',
		copy: 'homepage.earning.vote-and-govern.copy',
		image: <VoteNGovernIcon />,
	},
];

const Earning = () => {
	const { t } = useTranslation();

	const title = (
		<>
			<SmallGoldenHeader>{t('homepage.earning.title')}</SmallGoldenHeader>
			<WhiteHeader>
				<Trans i18nKey={'homepage.earning.description'} components={[<Emphasis />]} />
			</WhiteHeader>
			<GrayCopy>{t('homepage.earning.copy')}</GrayCopy>
		</>
	);

	const totalTradeStats = useGetFuturesCumulativeStats();
	return (
		<BackgroundContainer>
			<Container>
				<FlexDivColCentered>{title}</FlexDivColCentered>
				<StyledFlexContainer>
					{EARNINGS.map(({ id, title, copy, image }) => (
						<FeatureCard key={id}>
							<FeatureIconContainer>{image}</FeatureIconContainer>
							<FeatureContentTitle>
								<CenteredTitle>{t(title)}</CenteredTitle>
							</FeatureContentTitle>
							<CenteredCopy>{t(copy)}</CenteredCopy>
						</FeatureCard>
					))}
				</StyledFlexContainer>
				<StatsCardContainer>
					<StatsCard className="first">
						<StatsValue>
							{totalTradeStats.isLoading ? (
								<Loader />
							) : (
								formatCurrency(Synths.sUSD, totalTradeStats.data?.totalVolume || zeroBN, {
									sign: '$',
									minDecimals: 0,
								})
							)}
						</StatsValue>
						<StatsName>{t('homepage.earning.stats.volume')}</StatsName>
					</StatsCard>
					<StatsCard>
						<StatsValue>
							{totalTradeStats.isLoading ? (
								<Loader />
							) : (
								formatNumber(totalTradeStats.data?.totalTrades ?? 0, { minDecimals: 0 })
							)}
						</StatsValue>
						<StatsName>{t('homepage.earning.stats.trades')}</StatsName>
					</StatsCard>
				</StatsCardContainer>
				<CTAContainer>
					<Link href={ROUTES.Home.Overview}>
						<Button variant="primary" isRounded={false} size="md" disabled>
							{t('homepage.earning.stake-kwenta')}
						</Button>
					</Link>
					<Link href={ROUTES.Home.Overview}>
						<StyledButton isRounded={false} size="md" disabled>
							{t('homepage.earning.how-to-earn')}
							<ArrowUpRightIcon />
						</StyledButton>
					</Link>
				</CTAContainer>
			</Container>
		</BackgroundContainer>
	);
};

const GrayCopy = styled(Copy)`
	margin-top: 17px;
	text-align: center;
	width: 446px;
	font-size: 18px;
	line-height: 100%;
	color: ${(props) => props.theme.colors.common.secondaryGray};
`;

const Emphasis = styled.b`
	color: ${(props) => props.theme.colors.common.primaryGold};
`;

const StyledButton = styled(Button)`
	display: flex;
	align-items: center;
	justify-content: center;
	text-transform: none;
`;

const StatsName = styled.div`
	font-size: 15px;
	letter-spacing: -0.02em;
	text-transform: uppercase;
	color: ${(props) => props.theme.colors.common.secondaryGray};
`;
const StatsValue = styled.div`
	font-size: 40px;
	line-height: 100%;
	color: ${(props) => props.theme.colors.common.primaryWhite};
	margin-top: 14px;
	margin-bottom: 10px;
`;
const StatsCardContainer = styled(FlexDivRow)`
	margin: 80px 0px;
	justify-content: center;
	width: 1160px;
	border-top: 1px solid #3d3c3c;
`;

const StatsCard = styled(FlexDivColCentered)`
	width: 580px;
	padding: 10px 45px;
	margin-top: 40px;

	&.first {
		border-right: 1px solid #3d3c3c;
	}
`;
const CenteredCopy = styled(Copy)`
	font-size: 15px;
	text-align: center;
	line-height: 150%;
	letter-spacing: -0.03em;
	color: ${(props) => props.theme.colors.common.secondaryGray};
`;

const CenteredTitle = styled(Title)`
	font-family: ${(props) => props.theme.fonts.compressedBlack};
	text-transform: uppercase;
	font-size: 24px;
`;

const BackgroundContainer = styled.div`
	background: linear-gradient(180deg, #0f0f0f 0%, #1e1e1e 100%);
	background-size: 2400px 1145px;
	padding-bottom: 125px;
	margin-left: -1000px;
	margin-right: -1000px;
	display: flex;
	justify-content: center;
`;
const Container = styled.div`
	width: 1160px;
	margin-top: 125px;
`;

const StyledFlexContainer = styled(FlexDivRow)`
	width: 1160px;
	justify-content: center;
`;

const FeatureCard = styled(FlexDivCol)`
	margin-top: 90px;
	padding: 0px 40px;
`;

const FeatureIconContainer = styled.div`
	padding-bottom: 25px;
	svg {
		width: 64px;
		height: 64px;
	}
	display: flex;
	justify-content: center;
`;

const FeatureContentTitle = styled(FlexDivCentered)`
	padding-bottom: 20px;
	justify-content: center;
`;

const CTAContainer = styled.div`
	margin-top: 120px;
	display: flex;
	justify-content: center;
	gap: 20px;
	width: 1160px;
`;

export default Earning;

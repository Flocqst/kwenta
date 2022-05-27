import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import {
	FlexDivCol,
	FlexDivColCentered,
	FlexDivRow,
	SmallGoldenHeader,
	WhiteHeader,
} from 'styles/common';
import ArrowUpRightIcon from 'assets/svg/app/arrow-up-right.svg';
import FaqIcon from 'assets/png/learn/faq.png';
import HowToTradeIcon from 'assets/svg/learn/how-to-trade.svg';
import HowToStakeIcon from 'assets/svg/learn/how-to-stake.svg';
import HowGovernanceIcon from 'assets/svg/learn/how-governance.svg';
import { Copy, Title } from '../common';
import Button from 'components/Button';
import { EXTERNAL_LINKS } from 'constants/links';

const LEARNS = [
	{
		key: 'how-to-trade',
		title: 'homepage.learn.how-to-trade.title',
		copy: 'homepage.learn.how-to-trade.copy',
		image: <HowToTradeIcon />,
		onClick: () => window.open(EXTERNAL_LINKS.Docs.HowToTrade, '_blank'),
	},
	{
		key: 'how-to-stake',
		title: 'homepage.learn.how-to-stake.title',
		copy: 'homepage.learn.how-to-stake.copy',
		image: <HowToStakeIcon />,
		onClick: () => {},
	},
	{
		key: 'how-governance',
		title: 'homepage.learn.how-governance.title',
		copy: 'homepage.learn.how-governance.copy',
		image: <HowGovernanceIcon />,
		onClick: () => window.open(EXTERNAL_LINKS.Docs.Governance, '_blank'),
	},
	{
		key: 'faq',
		title: 'homepage.learn.faq',
		copy: '',
		image: <img src={FaqIcon} />,
		onClick: () => {},
	},
];

const Learn = () => {
	const { t } = useTranslation();

	const title = (
		<>
			<SmallGoldenHeader>{t('homepage.learn.title')}</SmallGoldenHeader>
			<WhiteHeader>{t('homepage.learn.description')}</WhiteHeader>
		</>
	);

	return (
		<Container>
			<FlexDivColCentered>{title}</FlexDivColCentered>
			<StyledFlexDivRow>
				{LEARNS.map(({ key, title, copy, image, onClick }) => (
					<FeatureCard key={key} className={key}>
						<FeatureIconContainer className={key}>{image}</FeatureIconContainer>
						<FeatureContentContainer>
							{key !== 'faq' ? (
								<FeatureTitle className={key}>{t(title)}</FeatureTitle>
							) : (
								<FeatureTitle className={key}>
									{t(title)}
									<ArrowUpRightIcon />
								</FeatureTitle>
							)}
							<FeatureCopy>{t(copy)}</FeatureCopy>
							{key !== 'faq' ? (
								<StyledButton
									isRounded={false}
									size="sm"
									onClick={onClick}
									disabled={key === 'how-to-stake'}
								>
									{t('homepage.learn.title')}
									<ArrowUpRightIcon />
								</StyledButton>
							) : (
								<></>
							)}
						</FeatureContentContainer>
					</FeatureCard>
				))}
			</StyledFlexDivRow>
		</Container>
	);
};

const StyledButton = styled(Button)`
	width: 148px;
	height: 40px;
	display: flex;
	align-items: center;
	padding: 0px 30px;
`;

const FeatureCopy = styled(Copy)`
	font-size: 15px;
	line-height: 150%;
	letter-spacing: -0.04em;
	color: ${(props) => props.theme.colors.common.secondaryGray};
	margin-bottom: 36px;
	width: 280px;
`;

const FeatureTitle = styled(Title)`
	font-size: 24px;
	line-height: 100%;
	font-family: ${(props) => props.theme.fonts.compressedBlack};
	text-transform: uppercase;
	color: ${(props) => props.theme.colors.white};
	text-shadow: 0px 0px 12.83px rgba(255, 255, 255, 0.2);
	width: 203px;
	padding-bottom: 20px;

	&.how-to-stake,
	&.how-governance {
		width: 252px;
	}

	&.how-to-trade {
		margin-top: 0px;
		width: 203px;
	}

	&.faq {
		padding-bottom: 0px;
		margin: 5px;
		margin-left: 0px;
	}

	svg {
		width: 20px;
		height: 20px;
	}
`;

const StyledFlexDivRow = styled(FlexDivRow)`
	margin: auto;
	margin-top: 60px;
	gap: 20px 20px;
	width: 766px;
	flex-wrap: wrap;
`;

const Container = styled.div`
	margin-bottom: 140px;
`;

const FeatureCard = styled(FlexDivRow)`
	background: linear-gradient(180deg, rgba(40, 39, 39, 0.5) 0%, rgba(25, 24, 24, 0.5) 100%);
	box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25), inset 0px 1px 0px rgba(255, 255, 255, 0.1),
		inset 0px 0px 20px rgba(255, 255, 255, 0.03);
	border-radius: 15px;
	padding: 32px 32px 32px 32px;
	height: 380px;

	&.how-to-stake,
	&.how-governance {
		width: 373px;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	&.how-to-trade {
		width: 766px;
		height: 280px;
		display: flex;
		flex-direction: row-reverse;
		justify-content: space-between;
	}

	&.faq {
		width: 766px;
		height: 100px;
		flex-direction: row-reverse;
	}
`;

const FeatureIconContainer = styled.div`
	display: flex;
	align-items: center;
	width: 64px;
	height: 64px;

	&.faq {
		padding-bottom: 15px;
	}

	img {
		width: 60px;
		height: 60px;
	}

	&.how-to-stake {
		width: 154px;
		height: 100px;
		margin-bottom: 15px;
		padding-left: 10px;
	}

	&.how-governance {
		width: 156px;
		height: 100px;
		margin-bottom: 15px;
		padding-left: 10px;
	}

	&.how-to-trade {
		width: 332px;
		height: 200px;
	}
`;

const FeatureContentContainer = styled(FlexDivCol)`
	margin-left: 10px;
	width: 313px;
	justify-content: space-between;
`;

export default Learn;

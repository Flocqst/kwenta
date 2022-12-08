import Wei from '@synthetixio/wei';

import { FuturesAccountType } from 'queries/futures/types';
import { TransactionStatus } from 'sdk/types/common';
import {
	DelayedOrder,
	FuturesMarket,
	FuturesPosition,
	FuturesPotentialTradeDetails,
	FuturesVolumes,
} from 'sdk/types/futures';
import { PositionSide } from 'sections/futures/types';
import { FetchStatus } from 'state/types';
import { FuturesMarketAsset, FuturesMarketKey } from 'utils/futures';

export type IsolatedMarginOrderType = 'delayed' | 'market';
export type CrossMarginOrderType = 'market' | 'stop market' | 'limit';

export type TradeSizeInputs<T = Wei> = {
	nativeSize: T;
	susdSize: T;
	leverage: string;
};

export type CrossMarginTradeInputs<T = Wei> = TradeSizeInputs<T> & {
	leverage: string;
	orderPrice?: string | undefined;
};

export type IsolatedMarginTradeInputs<T = Wei> = TradeSizeInputs<T>;

export type FundingRateSerialized = {
	asset: FuturesMarketKey;
	fundingTitle: string;
	fundingRate: string | null;
};

export type FundingRate<T = Wei> = {
	asset: FuturesMarketKey;
	fundingTitle: string;
	fundingRate: T | null;
};

export type FuturesQueryStatuses = {
	markets: FetchStatus;
	crossMarginBalanceInfo: FetchStatus;
	dailyVolumes: FetchStatus;
	crossMarginPositions: FetchStatus;
	isolatedPositions: FetchStatus;
	openOrders: FetchStatus;
	crossMarginSettings: FetchStatus;
	isolatedTradePreview: FetchStatus;
	crossMarginTradePreview: FetchStatus;
};

export type FuturesTransactionType =
	| 'deposit_cross_margin'
	| 'withdraw_cross_margin'
	| 'approve_cross_margin'
	| 'deposit_isolated'
	| 'withdraw_isolated'
	| 'modify_isolated'
	| 'close_isolated'
	| 'close_cross_margin'
	| 'cancelDelayed_isolated'
	| 'executeDelayed_isolated';

export type FuturesTransaction = {
	type: FuturesTransactionType;
	status: TransactionStatus;
	error?: string;
	hash: string | null;
};

export type TransactionEstimation<T = Wei> = {
	error?: string | null | undefined;
	limit: T;
	cost: T;
};

export type TransactionEstimations = Record<FuturesTransactionType, TransactionEstimation<string>>;

export type TransactionEstimationPayload = {
	type: FuturesTransactionType;
	limit: string;
	cost: string;
	error?: string | null | undefined;
};

// TODO: Separate in some way by network and wallet
// so we can have persisted state between switching

export type FuturesState = {
	selectedType: FuturesAccountType;
	confirmationModalOpen: boolean;
	isolatedMargin: IsolatedMarginState;
	crossMargin: CrossMarginState;
	markets: FuturesMarket<string>[];
	queryStatuses: FuturesQueryStatuses;
	dailyMarketVolumes: FuturesVolumes<string>;
	transaction?: FuturesTransaction | undefined;
	transactionEstimations: TransactionEstimations;
};

export type CrossMarginBalanceInfo<T = Wei> = {
	freeMargin: T;
	keeperEthBal: T;
	allowance: T;
};

export type CrossMarginSettings<T = Wei> = {
	tradeFee: T;
	limitOrderFee: T;
	stopOrderFee: T;
};

export type TradePreviewResult = {
	data: FuturesPotentialTradeDetails<string> | null;
	error: string | null;
};

export type CrossMarginState = {
	tradeInputs: CrossMarginTradeInputs<string>;
	orderType: CrossMarginOrderType;
	selectedLeverage: string;
	leverageSide: PositionSide;
	selectedMarketKey: FuturesMarketKey;
	selectedMarketAsset: FuturesMarketAsset;
	showCrossMarginOnboard: boolean;
	position?: FuturesPosition<string>;
	balanceInfo: CrossMarginBalanceInfo<string>;
	tradePreview: TradePreviewResult;
	account: string | undefined;
	settings: CrossMarginSettings<string>;
	positions: {
		[account: string]: FuturesPosition<string>[];
	};
	openOrders: DelayedOrder<string>[];
};

export type IsolatedMarginState = {
	tradeInputs: IsolatedMarginTradeInputs<string>;
	priceImpact: string;
	orderType: IsolatedMarginOrderType;
	selectedLeverage: string;
	tradePreview: TradePreviewResult;
	leverageSide: PositionSide;
	selectedMarketKey: FuturesMarketKey;
	selectedMarketAsset: FuturesMarketAsset;
	position?: FuturesPosition<string>;
	positions: {
		[account: string]: FuturesPosition<string>[];
	};
	openOrders: DelayedOrder<string>[];
};

export type ModifyIsolatedPositionInputs = {
	sizeDelta: string;
	priceImpactDelta: string;
	delayed: boolean;
};

export const futuresPositionKeys = new Set([
	'remainingMargin',
	'accessibleMargin',
	'order.fee',
	'order.leverage',
	'position.notionalValue',
	'position.accruedFunding',
	'position.initialMargin',
	'position.profitLoss',
	'position.lastPrice',
	'position.size',
	'position.liquidationPrice',
	'position.initialLeverage',
	'position.leverage',
	'position.pnl',
	'position.pnlPct',
	'position.marginRatio',
]);
